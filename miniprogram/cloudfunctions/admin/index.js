// admin 云函数——Ark 模型 ID 维护 + 配置开关 + 品牌库重初始化（契约：miniprogram/api/admin.js）
// action：getConfig / updateConfig / reinitBrands
// 错误码：NO_FAMILY / FORBIDDEN / NO_ARK_KEY / ARK_* / LLM_PARSE_FAIL
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { getFlag } = require('./utils/flags');

const DEFAULT_MODEL = 'doubao-seed-2-0-lite-260428';
const TIME_BUDGET_MS = 45000; // 断点续跑单次调用预算（60s 上限留余量）

// 断点续跑状态（函数实例保温期间有效）：清空标志 + 已处理品牌名
let brandsCleared = false;
const processedNames = new Set();

// 品牌文案 LLM 提示词：不确定的年份留空，禁止编造获奖记录
const brandPrompt = (name, country) =>
  `你是咖啡品牌资料编辑。品牌：「${name}」${country ? '，国家：' + country : ''}。` +
  '为咖啡品牌库生成展示资料，严格只输出一个 JSON 对象，不要任何其他文字：' +
  '{"description":"一句话品牌简介，30字以内","founded":"成立年份，如 1971，不确定给空字符串","traits":"产品特点，40字以内"}。' +
  '要求：资料用于咖啡品牌库展示；不确定的成立年份留空，禁止编造获奖记录。';

// 文本 LLM 调用（与 recognizeBean 同 host/path，纯文本 messages）
function postText(key, model, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/chat/completions',
      method: 'POST',
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let j = {};
        try { j = JSON.parse(buf || '{}'); } catch (e) { /* keep empty */ }
        if (res.statusCode >= 400) return reject(new Error(`ARK_${res.statusCode}: ${buf.slice(0, 300)}`));
        resolve(j);
      });
    });
    req.on('timeout', () => req.destroy(new Error('ARK_REQUEST_TIMEOUT')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 截取首个 { 到末个 } 解析（容忍模型输出代码块等噪音）
function extractJson(content) {
  const s = String(content);
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) throw new Error('LLM_PARSE_FAIL');
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { throw new Error('LLM_PARSE_FAIL'); }
}

const cleanTxt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// 品牌全量重初始化：解析行 → 首调清空 → 逐品牌 LLM 文案 → 插入（logo 留空手传）→ 45s 预算断点续跑
async function reinitBrands(lines) {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error('NO_ARK_KEY: 请在函数配置里设置环境变量 ARK_API_KEY');
  const ark = await readArk();
  const model = (ark && ark.modelVision) || process.env.ARK_MODEL_VISION || DEFAULT_MODEL;
  const started = Date.now();

  // 首调清空 brands 全部文档（内置+用户自建，用户已确认；beans.brandId 悬空为已知代价）
  // 标志位防重复清空：实例保温期间只清一次，集合空则跳过清空步骤
  if (!brandsCleared) {
    const cnt = await db.collection('brands').count();
    if (cnt.total > 0) {
      await db.collection('brands').where({ _id: _.neq('__none__') }).remove();
    }
    brandsCleared = true;
    processedNames.clear();
  }

  // 解析行（支持中英文逗号）：「品牌名,国家」
  const entries = [];
  for (const line of (Array.isArray(lines) ? lines : [])) {
    const parts = String(line).split(/[，,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts[0] || processedNames.has(parts[0])) continue;
    entries.push({ name: parts[0], country: parts[1] || '' });
  }

  const processed = [], errors = [];
  for (const e of entries) {
    if (Date.now() - started > TIME_BUDGET_MS) break; // 预算到点，断点续跑
    try {
      const j = await postText(key, model, brandPrompt(e.name, e.country));
      const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!content) throw new Error('LLM_PARSE_FAIL');
      const info = extractJson(content);
      await db.collection('brands').add({ data: {
        name: e.name,
        nameEn: '',
        logo: '', // 留空手传（用户已定决策：AI 不生成 logo）
        country: e.country,
        flag: getFlag(e.country),
        description: cleanTxt(info.description, 120),
        founded: cleanTxt(info.founded, 10),
        traits: cleanTxt(info.traits, 120),
        isBuiltin: true,
      } });
      processedNames.add(e.name);
      processed.push(e.name);
    } catch (err) {
      // 单个失败跳过继续（不耗尽预算）；该品牌仍计入 remaining，下轮调用重试
      errors.push({ name: e.name, error: String(err.message || err).slice(0, 200) });
    }
  }

  const left = entries.filter((e) => !processedNames.has(e.name));
  return {
    processed: processed.length,
    remaining: left.length,
    nextLine: left.length ? left[0].name : '',
    errors,
    elapsedMs: Date.now() - started,
  };
}

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

async function readArk() {
  const r = await db.collection('config').doc('ark').get().catch(() => null);
  return r && r.data ? r.data : null;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'getConfig': {
      const ark = await readArk();
      if (ark) {
        return {
          modelVision: ark.modelVision || '', modelImage: ark.modelImage || '',
          autoIcon: ark.autoIcon !== false, source: 'config', // 缺省 true
        };
      }
      return { // 无 config 文档回退云函数环境变量
        modelVision: process.env.ARK_MODEL_VISION || '',
        modelImage: process.env.ARK_MODEL_IMAGE || '',
        autoIcon: true,
        source: 'fallback',
      };
    }
    case 'updateConfig': {
      const { role } = await requireFamily(OPENID);
      if (role !== 'owner') throw new Error('FORBIDDEN');
      const patch = event.patch || {};
      const data = {};
      if (patch.modelVision !== undefined) data.modelVision = patch.modelVision;
      if (patch.modelImage !== undefined) data.modelImage = patch.modelImage;
      if (patch.autoIcon !== undefined) data.autoIcon = !!patch.autoIcon;
      const ark = await readArk();
      if (ark) await db.collection('config').doc('ark').update({ data });
      else await db.collection('config').add({ data: { _id: 'ark', ...data } });
      const saved = await readArk();
      return {
        modelVision: saved.modelVision || '', modelImage: saved.modelImage || '',
        autoIcon: saved.autoIcon !== false, source: 'config',
      };
    }
    case 'reinitBrands': {
      const { role } = await requireFamily(OPENID);
      if (role !== 'owner') throw new Error('FORBIDDEN');
      return reinitBrands(event.lines);
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

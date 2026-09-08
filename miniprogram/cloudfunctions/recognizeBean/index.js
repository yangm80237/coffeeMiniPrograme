// recognizeBean 云函数——豆袋照片 AI 识别（契约：miniprogram/api/ai.js）
// 流程：fileID → 临时链接 → 下载 base64 → 方舟视觉模型 → 严格 JSON → 字段归一 → 品牌/风味标签匹配
// 错误码：NO_FAMILY / NO_ARK_KEY / NO_FILE / TEMP_URL_FAIL / ARK_* / AI_PARSE_FAIL（前端 catch 后空表单兜底）
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const PROMPT = '你是咖啡豆袋标签识别助手。从图片提取字段，只输出一个 JSON 对象，不要任何其他文字：' +
  '{"brand":"品牌名","name":"豆名","country":"国家","origin":"产区","variety":"豆种","process":"处理法",' +
  '"altitude":"海拔如2200m","weight":克重数字,"roastLevel":"浅|中浅|中|中深|深 之一","roastDate":"YYYY-MM-DD",' +
  '"flavorDesc":"风味描述原文"}。图片中无法识别的字段一律用空字符串，数字字段用 null。';
const DEFAULT_MODEL = 'doubao-seed-2-0-lite-260428';

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

// 内置（无 familyId）∪ 本家庭，同 brand/flavor 云函数口径
const builtinOrMine = (familyId) => _.or([{ familyId }, { familyId: _.exists(false) }, { familyId: null }]);
const escapeReg = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function postChat(key, model, b64) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
      temperature: 0.2,
    });
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/chat/completions',
      method: 'POST',
      timeout: 50000,
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

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 400) return reject(new Error(`IMG_${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(30000, () => req.destroy(new Error('IMG_TIMEOUT')));
    req.on('error', reject);
  });
}

// 截取首个 { 到末个 } 的子串解析（容忍模型输出代码块等噪音）
function extractJson(content) {
  const s = String(content);
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) throw new Error('AI_PARSE_FAIL');
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { throw new Error('AI_PARSE_FAIL'); }
}

// roastLevel 归一五档：中深/中浅优先判（同时含「中+深/浅」），再 深/浅/中；含「浅烘/中烘/深烘」及英文
function normalizeRoast(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return '';
  if (/中深|medium[\s-]?dark/.test(s)) return '中深';
  if (/中浅|medium[\s-]?light|light[\s-]?medium/.test(s)) return '中浅';
  if (/深|dark/.test(s)) return '深';
  if (/浅|light/.test(s)) return '浅';
  if (/中|medium/.test(s)) return '中';
  return '';
}

function normalizeDate(v) {
  const m = String(v || '').match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return '';
  return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
}

async function writeLog(openid, familyId, model, started, ok, error) {
  try {
    await db.collection('ai_logs').add({ data: {
      action: 'recognize', openid, familyId: familyId || null, model,
      ms: Date.now() - started, ok, error: error ? String(error).slice(0, 200) : '',
      createdAt: db.serverDate(),
    } });
  } catch (e) { /* 日志失败不影响主流程 */ }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const started = Date.now();
  const key = process.env.ARK_API_KEY;
  let familyId = null;
  try {
    ({ familyId } = await requireFamily(OPENID));
    if (!key) throw new Error('NO_ARK_KEY: 请在函数配置里设置环境变量 ARK_API_KEY');
    const fileID = event.fileID;
    if (!fileID) throw new Error('NO_FILE');

    // 1. 云存储临时链接
    const t = await cloud.getTempFileURL({ fileList: [fileID] });
    const url = t.fileList && t.fileList[0] && t.fileList[0].tempFileURL;
    if (!url) throw new Error('TEMP_URL_FAIL');

    // 2. 下载图片 → base64
    const buf = await fetchBuffer(url);
    const b64 = buf.toString('base64');

    // 3. 模型配置：config.ark.modelVision → 环境变量 → 默认
    const ark = await db.collection('config').doc('ark').get().catch(() => null);
    const model = (ark && ark.data && ark.data.modelVision)
      || process.env.ARK_MODEL_VISION || DEFAULT_MODEL;

    // 4. 方舟视觉模型
    const j = await postChat(key, model, b64);
    const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!content) throw new Error('AI_PARSE_FAIL');

    // 5-7. 解析 + 字段归一（键与 confirm 页 EMPTY 完全一致，前端直接合并）
    const raw = extractJson(content);
    const weight = Number(raw.weight);
    const form = {
      name: String(raw.name || '').trim(),
      brandId: '',
      brandName: String(raw.brand || '').trim(),
      country: String(raw.country || '').trim(),
      origin: String(raw.origin || '').trim(),
      variety: String(raw.variety || '').trim(),
      process: String(raw.process || '').trim(),
      altitude: String(raw.altitude || '').trim(),
      weight: Number.isFinite(weight) && weight > 0 ? weight : '',
      roastLevel: normalizeRoast(raw.roastLevel),
      roastDate: normalizeDate(raw.roastDate),
      brewMethod: '',
      flavorTagIds: [],
      flavorDesc: String(raw.flavorDesc || '').trim(),
    };

    // 8. 品牌匹配：品牌名与识别 brandName 互相 contains
    if (form.brandName) {
      const br = await db.collection('brands').where(builtinOrMine(familyId)).limit(1000).get();
      const re = new RegExp(escapeReg(form.brandName), 'i');
      const hit = br.data.find((b) => b.name
        && (re.test(b.name) || new RegExp(escapeReg(b.name), 'i').test(form.brandName)));
      if (hit) { form.brandId = hit._id; form.brandName = hit.name; }
    }

    // 9. 风味匹配：flavorDesc 包含标签名（内置 ∪ 本家庭）
    const fr = await db.collection('flavor_tags').where(builtinOrMine(familyId)).limit(1000).get();
    const desc = form.flavorDesc.toLowerCase();
    form.flavorTagIds = fr.data
      .filter((f) => f.name && desc.includes(String(f.name).toLowerCase()))
      .map((f) => f._id);

    await writeLog(OPENID, familyId, model, started, true, '');
    return { form };
  } catch (e) {
    await writeLog(OPENID, familyId, 'unknown', started, false, e && e.message);
    throw e;
  }
};

// recognizeBean 云函数——豆袋照片 AI 识别（契约：miniprogram/api/ai.js）
// 流程：fileID → 临时链接 → 下载 base64 → 方舟视觉模型 → 严格 JSON → normalize 清洗 → 品牌/风味标签匹配
// 返回 { form, newFlavors }：form 键与 confirm 页 EMPTY 完全一致；newFlavors = 库外新风味候选
// 错误码：NO_FAMILY / NO_ARK_KEY / NO_FILE / TEMP_URL_FAIL / ARK_* / AI_PARSE_FAIL（前端 catch 后空表单兜底）
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DEFAULT_MODEL = 'doubao-seed-2-0-lite-260428';

// ===== PROMPT v2：分层结构（任务 / 领域知识库 / 翻译规则 / 输出 schema / 质量标准）=====
// 适配 lite 档模型：词表全部内嵌进提示词（不依赖模型自身知识），逐字段说明输出要求
const PROMPT = `你是专业的咖啡豆包装标签识别助手。请从图片中提取结构化信息，严格只输出一个 JSON 对象，不要输出任何解释文字、注释或代码块标记。

【任务】识别包装上的品牌、豆名、产地、处理法、豆种、烘焙度、克重、烘焙日期与风味描述，按下述规则归一后输出。

【咖啡领域知识库】
1. 烘焙度五档判定（roastLevel 只能输出：浅 / 中浅 / 中 / 中深 / 深）：
- 浅：一爆密集前后出锅，豆表基本无油光，酸质明亮，常见标注 Light / Cinnamon / 极浅烘
- 中浅：一爆结束至一爆与二爆之间，酸甜平衡偏酸，常见标注 Medium-Light / City
- 中：一爆与二爆之间中段，酸甜均衡，常见标注 Medium / City+
- 中深：二爆初期，豆表少量出油，苦甜均衡偏苦，常见标注 Medium-Dark / Full City
- 深：二爆密集后，豆表明显出油，苦味主导，常见标注 Dark / French / Italian / 深烘
2. 处理法标准词表（process 必须输出以下标准词之一，无法判断给空字符串）：
- 水洗（Washed / Fully washed / 水洗处理）
- 日晒（Natural / Sun dried / Dry process / 日晒处理）
- 蜜处理（Honey，含黄蜜 Yellow / 红蜜 Red / 黑蜜 Black honey）
- 厌氧日晒（Anaerobic / Anaerobic natural / 厌氧发酵 / 双重厌氧 / 二氧化碳浸渍 Carbonic）
- 湿剥法（Wet hulled / Giling basah / Semi-washed，印尼苏门答腊常见）
- 半水洗（Pulped natural / Semi-washed 处理）
3. 常见产地国中英对照（country 输出中文标准名）：埃塞俄比亚 Ethiopia、肯尼亚 Kenya、巴拿马 Panama、哥伦比亚 Colombia、危地马拉 Guatemala、巴西 Brazil、印度尼西亚 Indonesia（苏门答腊/爪哇）、卢旺达 Rwanda、洪都拉斯 Honduras、哥斯达黎加 Costa Rica、也门 Yemen、中国 China（云南）、美国 USA（夏威夷）、日本 Japan、德国 Germany、丹麦 Denmark、挪威 Norway、韩国 Korea
4. 常见豆种表（variety 有对应中文优先输出中文，词表外保留原文）：瑰夏 Geisha/Gesha、铁皮卡 Typica、波旁 Bourbon、SL28、卡杜拉 Caturra、卡帝姆 Catimor、74158
5. 常见风味词参考（flavorDesc 与 flavors 用中文）：柑橘、柠檬、莓果、蓝莓、草莓、热带水果、芒果、菠萝、百香果、花香、茉莉、玫瑰、桂花、焦糖、蜂蜜、红糖、香草、巧克力、黑巧、坚果、榛子、杏仁、香料、肉桂、发酵、酒香、茶感、奶油、麦芽、草本

【翻译规则】
- brand 与 name：保留包装原文，拉丁字母/日文/韩文一律不翻译、不转写
- country：输出中文标准名（对照知识库 3）
- process：输出处理法标准词（对照知识库 2）
- variety：知识库 4 内有对应中文用词表名，没有则保留原文
- flavorDesc：翻译为中文
- flavors：每项为一个独立中文风味词（参考知识库 5），从风味描述拆分

【输出 JSON schema（逐字段说明）】
{
  "brand": "品牌名，保留原文，无法识别给空字符串",
  "name": "咖啡豆名，保留原文，无法识别给空字符串",
  "country": "国家，中文标准名，无法识别给空字符串",
  "origin": "产区/庄园/处理厂名，无法识别给空字符串",
  "variety": "豆种，按翻译规则输出，无法识别给空字符串",
  "process": "处理法标准词，无法识别给空字符串",
  "altitude": "海拔，如 2200m，无法识别给空字符串",
  "weight": "净含量克重数字，如 200，无法识别给 null",
  "roastLevel": "浅|中浅|中|中深|深 五档之一，无法判断给空字符串",
  "roastDate": "烘焙日期，格式 YYYY-MM-DD，无法识别给空字符串",
  "flavorDesc": "风味描述整句中文，无法识别给空字符串",
  "flavors": ["风味词1", "风味词2"]
}
flavors 说明：从包装风味栏/flavorDesc 拆出的独立风味词数组，每项 2-6 个字为佳，通常 2-6 项，无法提取给 []。

【质量标准】
- 只依据图片可见信息，禁止编造或推测缺失字段
- 无法识别的字符串字段给空字符串，数字给 null，flavors 给 []
- 同一包装重复识别时同一字段输出一致（选最直接的读数）
- 只输出一个 JSON 对象，第一个字符必须是 {`;

// ===== 词典（normalize 清洗用；可经 module.exports 供测试）=====
// country：英文 → 中文标准名 + 中文别名/简称（配合前缀容错）
const COUNTRY_MAP = {
  ethiopia: '埃塞俄比亚', kenya: '肯尼亚', panama: '巴拿马', colombia: '哥伦比亚',
  guatemala: '危地马拉', brazil: '巴西', indonesia: '印度尼西亚', sumatra: '印度尼西亚',
  rwanda: '卢旺达', honduras: '洪都拉斯', 'costa rica': '哥斯达黎加', yemen: '也门',
  china: '中国', usa: '美国', 'united states': '美国', america: '美国', hawaii: '美国',
  japan: '日本', germany: '德国', denmark: '丹麦', norway: '挪威',
  korea: '韩国', 'south korea': '韩国',
  埃塞俄比亚: '埃塞俄比亚', 埃塞: '埃塞俄比亚', 肯尼亚: '肯尼亚', 巴拿马: '巴拿马',
  哥伦比亚: '哥伦比亚', 危地马拉: '危地马拉', 巴西: '巴西', 印度尼西亚: '印度尼西亚',
  印尼: '印度尼西亚', 苏门答腊: '印度尼西亚', 卢旺达: '卢旺达', 洪都拉斯: '洪都拉斯',
  哥斯达黎加: '哥斯达黎加', 哥斯达: '哥斯达黎加', 也门: '也门', 中国: '中国',
  云南: '中国', 美国: '美国', 夏威夷: '美国', 日本: '日本', 德国: '德国',
  丹麦: '丹麦', 挪威: '挪威', 韩国: '韩国',
};
// process：同义词 → 标准词
const PROCESS_MAP = {
  'washed': '水洗', 'fully washed': '水洗', '水洗': '水洗',
  'natural': '日晒', 'sun dried': '日晒', 'dry process': '日晒', 'dry processed': '日晒', '日晒': '日晒',
  'black honey': '蜜处理', 'red honey': '蜜处理', 'yellow honey': '蜜处理',
  'honey': '蜜处理', '黄蜜': '蜜处理', '红蜜': '蜜处理', '黑蜜': '蜜处理', '蜜处理': '蜜处理',
  'anaerobic natural': '厌氧日晒', 'anaerobic': '厌氧日晒', '厌氧日晒': '厌氧日晒',
  'wet hulled': '湿剥法', 'giling basah': '湿剥法', 'semi washed': '湿剥法', '湿剥法': '湿剥法',
  'pulped natural': '半水洗', '半水洗': '半水洗',
};
// variety：小写 → 词表名（74158 等不在表内原样保留）
const VARIETY_MAP = {
  geisha: '瑰夏', gesha: '瑰夏', typica: '铁皮卡', bourbon: '波旁',
  sl28: 'SL28', sl34: 'SL34', caturra: '卡杜拉', catimor: '卡帝姆',
};

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

// ===== normalize 清洗模块（纯函数，可独立导出供测试）=====
// 通用清洗：trim、去包裹引号、去「产地：」「国家:」等前缀、压缩连续空格
function cleanStr(v) {
  let s = String(v == null ? '' : v).trim();
  s = s.replace(/^["'“”「『]+/, '').replace(/["'“”」』]+$/, '');
  s = s.replace(/^(产地|国家|地区|处理法|加工法|豆种|品种|风味|风味描述|品牌|豆名|名称|烘焙度|净含量)\s*[:：]\s*/, '');
  return s.replace(/\s+/g, ' ').trim();
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

// country：精确命中 → 前缀容错（长 key 优先，含「埃塞」→埃塞俄比亚）→ 原样返回
function normalizeCountry(v, map) {
  const s = cleanStr(v);
  if (!s) return '';
  const low = s.toLowerCase();
  if (map[s]) return map[s];
  if (map[low]) return map[low];
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (s.startsWith(k) || low.startsWith(k)) return map[k];
  }
  return s;
}

// process：精确命中 → 英文包含匹配（长 key 优先）→ 中文标准词包含 → 原样返回
function normalizeProcess(v, map) {
  const s = cleanStr(v);
  if (!s) return '';
  const low = s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (map[s]) return map[s];
  if (map[low]) return map[low];
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (/[a-z]/.test(k) && low.includes(k)) return map[k];
  }
  for (const k of keys) {
    if (!/[a-z]/.test(k) && s.includes(k)) return map[k];
  }
  if (/厌氧|二氧化碳浸渍|carbonic/.test(s + low)) return '厌氧日晒';
  return s;
}

// variety：小写化对照词表，表外原样保留
function normalizeVariety(v, map) {
  const s = cleanStr(v);
  if (!s) return '';
  return map[s.toLowerCase()] || s;
}

// flavors：逐项清洗、去空、去重、单项 ≤12 字
function normalizeFlavors(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const x of arr) {
    const s = cleanStr(x).slice(0, 12);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

// normalize(extracted, 词典)：识别原始 JSON → 干净 form 字段集（不含 brandId 等库匹配字段）
function normalize(raw, dict) {
  const d = dict || { country: COUNTRY_MAP, process: PROCESS_MAP, variety: VARIETY_MAP };
  const r = raw || {};
  const weight = Number(r.weight);
  return {
    name: cleanStr(r.name),
    brandName: cleanStr(r.brand),
    country: normalizeCountry(r.country, d.country),
    origin: cleanStr(r.origin),
    variety: normalizeVariety(r.variety, d.variety),
    process: normalizeProcess(r.process, d.process),
    altitude: cleanStr(r.altitude),
    weight: Number.isFinite(weight) && weight > 0 ? weight : '',
    roastLevel: normalizeRoast(r.roastLevel),
    roastDate: normalizeDate(r.roastDate),
    flavors: normalizeFlavors(r.flavors),
    flavorDesc: cleanStr(r.flavorDesc),
  };
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
  let model = '';
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
    model = (ark && ark.data && ark.data.modelVision)
      || process.env.ARK_MODEL_VISION || DEFAULT_MODEL;

    // 4. 方舟视觉模型
    const j = await postChat(key, model, b64);
    const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!content) throw new Error('AI_PARSE_FAIL');

    // 5. 解析 + 清洗归一（词表映射 + 通用清洗）
    const norm = normalize(extractJson(content));

    // 6. form 装配（键与 confirm 页 EMPTY 完全一致，前端直接合并）
    const form = {
      name: norm.name,
      brandId: '',
      brandName: norm.brandName,
      country: norm.country,
      origin: norm.origin,
      variety: norm.variety,
      process: norm.process,
      altitude: norm.altitude,
      weight: norm.weight,
      roastLevel: norm.roastLevel,
      roastDate: norm.roastDate,
      brewMethod: '',
      flavorTagIds: [],
      flavorDesc: norm.flavorDesc,
    };

    // 7. 品牌匹配：品牌名与识别 brandName 互相 contains
    if (form.brandName) {
      const br = await db.collection('brands').where(builtinOrMine(familyId)).limit(1000).get();
      const re = new RegExp(escapeReg(form.brandName), 'i');
      const hit = br.data.find((b) => b.name
        && (re.test(b.name) || new RegExp(escapeReg(b.name), 'i').test(form.brandName)));
      if (hit) { form.brandId = hit._id; form.brandName = hit.name; }
    }

    // 8. 风味匹配：flavorDesc 包含标签名 ∪ flavors 精确命中（内置 ∪ 本家庭）
    const fr = await db.collection('flavor_tags').where(builtinOrMine(familyId)).limit(1000).get();
    const desc = form.flavorDesc.toLowerCase();
    const tagIds = fr.data
      .filter((f) => f.name
        && (desc.includes(String(f.name).toLowerCase()) || norm.flavors.includes(f.name)))
      .map((f) => f._id);
    form.flavorTagIds = Array.from(new Set(tagIds));

    // 9. 库外新风味候选：flavors 中无法被风味库 name 精确匹配的项
    const known = new Set(fr.data.map((f) => f.name));
    const newFlavors = norm.flavors.filter((n) => !known.has(n));

    await writeLog(OPENID, familyId, model, started, true, '');
    return { form, newFlavors };
  } catch (e) {
    await writeLog(OPENID, familyId, model || 'unknown', started, false, e && e.message);
    throw e;
  }
};

// 供测试/复用导出（云函数运行时仅使用 main）
module.exports = { main, normalize, PROMPT, COUNTRY_MAP, PROCESS_MAP, VARIETY_MAP };

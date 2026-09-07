// genFlavorIcon 云函数——Seedream v4 提示词生成 → jimp 抠图透明底 → 云存储 → 写回 flavor_tags.iconUrl
// 断点续跑模式（平台超时上限 60s）：每次调用自动挑选「还没有 iconUrl」的内置风味生成，
// 45 秒预算到点即返回进度；在测试面板重复点「测试」（入参 {}）直到 remaining=0。
// 重生成单个：{"names":["黑巧"],"force":true}
// 环境变量：ARK_API_KEY（必填）、ARK_MODEL_IMAGE（可选，默认 doubao-seedream-5-0-260128）
const cloud = require('wx-server-sdk');
const https = require('https');
const Jimp = require('jimp');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const SIZE = '2048x2048';          // Seedream 5.0 最低 368 万像素
const PROC_SIZE = 1024;            // 处理与存储分辨率（展示最大 288px，3 倍冗余）
const BG_DIFF_TOTAL = 35;          // floodfill 背景判定：与纯白的通道差和 ≤ 35（与本地 PIL thresh=35 一致）
const TIME_BUDGET_MS = 45000;      // 单次调用时间预算（60s 上限留 15s 余量）

// 45 个内置风味的英文提示词映射（缺省回落中文名）
const EN = {
  '草莓': 'strawberry', '橙子': 'orange', '柠檬': 'lemon', '蓝莓': 'blueberry',
  '桃子': 'peach', '芒果': 'mango', '菠萝': 'pineapple', '苹果': 'apple',
  '葡萄': 'grape', '樱桃': 'cherry', '百香果': 'passion fruit', '猕猴桃': 'kiwi fruit',
  '茉莉': 'jasmine flower', '玫瑰': 'rose', '桂花': 'osmanthus flowers',
  '洋甘菊': 'chamomile', '薰衣草': 'lavender', '橙花': 'orange blossom',
  '蜂蜜': 'honey jar', '焦糖': 'caramel', '香草': 'vanilla pods',
  '红糖': 'brown sugar', '糖蜜': 'molasses', '枫糖': 'maple syrup',
  '榛子': 'hazelnut', '杏仁': 'almonds', '黑巧': 'dark chocolate bar with squares',
  '牛奶巧克力': 'milk chocolate piece', '花生': 'peanuts', '椰子': 'coconut',
  '胡椒': 'black peppercorns', '丁香': 'cloves', '肉豆蔻': 'nutmeg',
  '肉桂': 'cinnamon sticks', '八角': 'star anise',
  '麦芽': 'malted barley', '谷物': 'cereal grains', '烟熏': 'smoked wood chips',
  '烤可可': 'roasted cacao nibs', '饼干': 'butter cookies',
  '茶感': 'green tea leaves', '奶油': 'cream swirl', '发酵感': 'fermented berries',
  '草本': 'fresh herbs', '清爽': 'fresh water splash with mint',
};

const buildPrompt = (name) =>
  `vibrant illustration icon of ${EN[name] || name} (${name}), rich highly saturated colors, ` +
  `intricate details, single object centered, isolated on pure white background, no text`;

function postJson(key, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/images/generations',
      method: 'POST',
      timeout: 60000,
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
    https.get(url, (res) => {
      if (res.statusCode >= 400) return reject(new Error(`IMG_${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// 抠图：从四角洪泛填充近白背景 → 背景透明（扫描线实现，等价 PIL floodfill thresh）
async function cutout(pngBuf) {
  const img = await Jimp.read(pngBuf);
  img.resize(PROC_SIZE, PROC_SIZE);
  const { width: w, height: h, data } = img.bitmap;
  const diffFromWhite = (x, y) => {
    const i = (y * w + x) * 4;
    return Math.abs(data[i] - 255) + Math.abs(data[i + 1] - 255) + Math.abs(data[i + 2] - 255);
  };
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  const visited = new Uint8Array(w * h);
  const stack = [];
  for (const [sx, sy] of corners) {
    if (diffFromWhite(sx, sy) <= BG_DIFF_TOTAL) {
      visited[sy * w + sx] = 1;
      stack.push(sy * w + sx);
    }
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of nb) {
      if (q >= 0 && !visited[q]) {
        if (diffFromWhite(q % w, (q / w) | 0) <= BG_DIFF_TOTAL) { visited[q] = 1; stack.push(q); }
      }
    }
  }
  for (let p = 0; p < w * h; p++) {
    if (visited[p]) data[p * 4 + 3] = 0; // 背景 → 透明
  }
  return img.getBufferAsync(Jimp.MIME_PNG);
}

exports.main = async (event) => {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error('NO_ARK_KEY: 请在函数配置里设置环境变量 ARK_API_KEY');
  const model = event.model || process.env.ARK_MODEL_IMAGE || 'doubao-seedream-5-0-260128';
  const started = Date.now();

  // 待生成名单：force+names 指定重生；否则自动挑「isBuiltin 且无 iconUrl」的
  let queue;
  if (event.names && event.names.length) {
    queue = event.names;
  } else {
    const pend = await db.collection('flavor_tags')
      .where({ isBuiltin: true, iconUrl: _.exists(false) })
      .limit(100)
      .get();
    queue = pend.data.map((f) => f.name);
  }

  const results = [], errors = [];
  for (const name of queue) {
    if (Date.now() - started > TIME_BUDGET_MS) break; // 预算到点，断点续跑
    try {
      const prompt = buildPrompt(name);
      const j = await postJson(key, { model, prompt, size: SIZE, output_format: 'png', response_format: 'url', watermark: false });
      const url = j && j.data && j.data[0] && j.data[0].url;
      if (!url) throw new Error('NO_URL');
      const raw = await fetchBuffer(url);
      const png = await cutout(raw);
      const up = await cloud.uploadFile({ cloudPath: `flavors/${name}.png`, fileContent: png });
      const q = await db.collection('flavor_tags')
        .where({ name, isBuiltin: true })
        .update({ data: { iconUrl: up.fileID, iconPrompt: prompt, updateTime: db.serverDate() } });
      results.push({ name, fileID: up.fileID, updated: q.stats && q.stats.updated });
    } catch (e) {
      errors.push({ name, error: String(e.message || e).slice(0, 200) });
    }
  }

  const left = await db.collection('flavor_tags')
    .where({ isBuiltin: true, iconUrl: _.exists(false) }).count();
  return { processed: results, errors, remaining: left.total, elapsedMs: Date.now() - started };
};

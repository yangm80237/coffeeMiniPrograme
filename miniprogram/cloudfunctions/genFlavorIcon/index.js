// genFlavorIcon 云函数——Seedream 生成水彩风味图标 → 云存储 → 写回 flavor_tags.iconUrl
// 用法（DevTools 云端测试）：{"names":["草莓","茉莉","黑巧"]}
// 环境变量：ARK_API_KEY（必填）、ARK_MODEL_IMAGE（可选，默认 doubao-seedream-5-0-260128）
// 单次最多 5 个（每张约 10-20s，请把函数超时调到 120s）；重复运行=重新生成覆盖
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const SIZE = '2048x2048'; // Seedream 5.0 最低 368 万像素

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
  `watercolor illustration of ${EN[name] || name} (${name}), single object, white background, soft warm colors, hand painted style, minimal, centered, no text`;

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

exports.main = async (event) => {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error('NO_ARK_KEY: 请在函数配置里设置环境变量 ARK_API_KEY');
  const model = event.model || process.env.ARK_MODEL_IMAGE || 'doubao-seedream-5-0-260128';
  const names = event.names;
  if (!Array.isArray(names) || !names.length || names.length > 5) {
    throw new Error('NAMES_REQUIRED: names 数组必填，单次最多 5 个');
  }
  const results = [];
  for (const name of names) {
    const prompt = buildPrompt(name);
    const j = await postJson(key, { model, prompt, size: SIZE, response_format: 'url', watermark: false });
    const url = j && j.data && j.data[0] && j.data[0].url;
    if (!url) throw new Error(`NO_URL: ${name}`);
    const buf = await fetchBuffer(url);
    const up = await cloud.uploadFile({ cloudPath: `flavors/${name}.png`, fileContent: buf });
    const q = await db.collection('flavor_tags')
      .where({ name, isBuiltin: true })
      .update({ data: { iconUrl: up.fileID, iconPrompt: prompt, updateTime: db.serverDate() } });
    results.push({ name, fileID: up.fileID, updated: q.stats && q.stats.updated });
  }
  return { results };
};

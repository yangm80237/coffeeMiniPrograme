const test = require('node:test');
const assert = require('node:assert');
const { SIMILAR_THRESHOLD, normalizeName, editDistance, similarity, bestMatch, shouldCreate } = require('../utils/similarity');

test('normalizeName 归一：小写/去空白/分隔符', () => {
  assert.equal(normalizeName(' 青葡萄 '), '青葡萄');
  assert.equal(normalizeName('青 葡 萄'), '青葡萄');
  assert.equal(normalizeName('Grape-fruit'), 'grapefruit');
});

test('editDistance 标准距离', () => {
  assert.equal(editDistance('蓝苺', '蓝莓'), 1);
  assert.equal(editDistance('', 'abc'), 3);
  assert.equal(editDistance('abc', 'abc'), 0);
  assert.equal(editDistance('kitten', 'sitting'), 3);
});

test('similarity：完全相等 = 1', () => {
  assert.equal(similarity('葡萄', '葡萄'), 1);
  assert.equal(similarity('BlueBerry', 'blueberry'), 1); // 大小写忽略
});

test('similarity：包含关系 = 0.85（长度≥2）', () => {
  assert.equal(similarity('青葡萄', '葡萄'), 0.85);
  assert.equal(similarity('百香果', '香果'), 0.85);
});

test('similarity：编辑距离 ≤1 = 0.8', () => {
  assert.equal(similarity('蓝苺', '蓝莓'), 0.8);
  assert.equal(similarity('柠檬', '柠蒙'), 0.8);
});

test('similarity：无关词远低于阈值', () => {
  const s = similarity('铁观音', '柠檬');
  assert.ok(s < SIMILAR_THRESHOLD, `铁观音/柠檬 相似度应<0.6，实际 ${s}`);
  assert.equal(similarity(''), 0); // 空输入
});

test('bestMatch：返回最相似项与分数', () => {
  const m = bestMatch('青葡萄', ['葡萄', '柠檬', '蓝莓']);
  assert.equal(m.name, '葡萄');
  assert.equal(m.score, 0.85);
  assert.equal(bestMatch('青葡萄', []).score, 0); // 空库
});

test('shouldCreate：≥阈值 不新建 / <阈值 新建', () => {
  const lib = ['葡萄', '柠檬', '蓝莓'];
  assert.equal(shouldCreate('青葡萄', lib), false); // 0.85 ≥ 0.6 → 合并
  assert.equal(shouldCreate('蓝苺', lib), false); // 0.8 ≥ 0.6 → 合并
  assert.equal(shouldCreate('铁观音', lib), true); // 0 < 0.6 → 自动创建
  assert.equal(shouldCreate('百香果', lib), true); // 与库内无相似 → 创建
  assert.equal(shouldCreate('葡萄', lib), false); // 完全相等
});

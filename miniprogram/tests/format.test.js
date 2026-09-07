const test = require('node:test');
const assert = require('node:assert');
const { formatDate, daysAgo, avgScore, firstChar } = require('../utils/format');

test('formatDate 默认点分', () => {
  assert.equal(formatDate('2026-08-28'), '2026.08.28');
  assert.equal(formatDate('2026-08-28', '-'), '2026-08-28');
});
test('daysAgo 按自然日', () => assert.equal(daysAgo('2026-09-05', new Date('2026-09-07T12:00:00')), 2));
test('avgScore 单方/双方/空', () => {
  assert.equal(avgScore(4, null), '4.0'); assert.equal(avgScore(4, 5), '4.5'); assert.equal(avgScore(null, null), '');
});
test('firstChar', () => { assert.equal(firstChar('铁皮卡'), '铁'); assert.equal(firstChar(''), '?'); });

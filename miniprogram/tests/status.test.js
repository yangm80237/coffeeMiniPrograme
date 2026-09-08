const test = require('node:test');
const assert = require('node:assert');
const { getRestDays, computeStatus, statusBarText } = require('../utils/status');
const d = (s) => new Date(s + 'T00:00:00');

test('养豆期：5-10月20天，其他25天', () => {
  assert.equal(getRestDays(d('2026-05-01')), 20);
  assert.equal(getRestDays(d('2026-10-31')), 20);
  assert.equal(getRestDays(d('2026-04-30')), 25);
  assert.equal(getRestDays(d('2026-11-01')), 25);
});
test('未到期→养豆中含剩余天数', () => {
  const r = computeStatus({ roastDate: '2026-08-28' }, d('2026-09-07'));
  assert.equal(r.status, 'resting'); assert.equal(r.restDays, 20); assert.equal(r.daysLeft, 10);
});
test('到期自动转在喝，dayOfPeak 从1起', () => {
  const r = computeStatus({ roastDate: '2026-08-28' }, d('2026-09-20'));
  assert.equal(r.status, 'drinking'); assert.equal(r.dayOfPeak, 4);
});
test('手动覆盖 hurry/finished/drinking/resting', () => {
  const base = { roastDate: '2026-09-01' };
  assert.equal(computeStatus({ ...base, statusOverride: 'hurry' }, d('2026-09-03')).status, 'hurry');
  assert.equal(computeStatus({ ...base, statusOverride: 'finished' }, d('2026-09-03')).status, 'finished');
  assert.equal(computeStatus({ ...base, statusOverride: 'drinking' }, d('2026-09-03')).status, 'drinking');
  assert.equal(computeStatus({ ...base, statusOverride: 'resting' }, d('2026-09-03')).status, 'resting');
});
test('statusOverride=null 等价自动计算', () => {
  assert.equal(computeStatus({ roastDate: '2026-09-01', statusOverride: null }, d('2026-09-03')).status, 'resting');
});
test('状态条文案（规格书3.4；克重移至属性磁贴，状态条不再重复）', () => {
  const now = d('2026-09-07');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200 }, now), '还需10天 · 养豆期20天');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'drinking' }, now), '最佳赏味第11天');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'hurry' }, now), '风味衰退期 · 尽快饮用');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'finished' }, now), '本袋已喝完');
});

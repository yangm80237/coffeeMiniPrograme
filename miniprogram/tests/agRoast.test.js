const test = require('node:test');
const assert = require('node:assert');
const { AG_LEVELS, agtronToRoast, agValueToRoast } = require('../utils/agRoast');

test('agtronToRoast 数值表：85+浅 / 75-84中浅 / 65-74中 / 55-64中深 / <55深', () => {
  assert.equal(agtronToRoast(100), '浅');
  assert.equal(agtronToRoast(85), '浅');
  assert.equal(agtronToRoast(80), '中浅');
  assert.equal(agtronToRoast(70), '中');
  assert.equal(agtronToRoast(60), '中深');
  assert.equal(agtronToRoast(50), '深');
  assert.equal(agtronToRoast(35), '深');
  // 边界与非法输入
  assert.equal(agtronToRoast(0), '');
  assert.equal(agtronToRoast(101), '');
  assert.equal(agtronToRoast('abc'), '');
  assert.equal(agtronToRoast(''), '');
});

test('agValueToRoast ① 数值优先：Agtron/Ag/色值 + 2-3 位', () => {
  assert.equal(agValueToRoast('Agtron 55'), '中深');
  assert.equal(agValueToRoast('Ag 85'), '浅');
  assert.equal(agValueToRoast('色值 60'), '中深');
  assert.equal(agValueToRoast('烘焙色值 45'), '深');
  assert.equal(agValueToRoast('Agtron 70'), '中');
});

test('agValueToRoast ② Ag 个位档号：Ag1浅 / Ag2中浅 / Ag3中 / Ag4中深 / Ag5深', () => {
  assert.equal(agValueToRoast('Ag1'), '浅');
  assert.equal(agValueToRoast('Ag2'), '中浅');
  assert.equal(agValueToRoast('Ag3'), '中');
  assert.equal(agValueToRoast('Ag4'), '中深');
  assert.equal(agValueToRoast('Ag5'), '深');
  assert.equal(agValueToRoast('ag 1'), '浅'); // 大小写 + 空格
  assert.equal(agValueToRoast('AG2'), '中浅');
  assert.deepEqual(AG_LEVELS, { 1: '浅', 2: '中浅', 3: '中', 4: '中深', 5: '深' });
});

test('agValueToRoast 优先级：Ag 55 按数值(中深) 而非档号 Ag5(深)', () => {
  assert.equal(agValueToRoast('Ag 55'), '中深');
});

test('agValueToRoast ③ 无法解析给空（交模型兜底）', () => {
  assert.equal(agValueToRoast(''), '');
  assert.equal(agValueToRoast('Light Roast'), '');
  assert.equal(agValueToRoast('海拔 1800m'), '');
  assert.equal(agValueToRoast('Ag9'), ''); // 档号超范围
});

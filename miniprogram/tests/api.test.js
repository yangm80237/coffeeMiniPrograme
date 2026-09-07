const test = require('node:test');
const assert = require('node:assert');
const beanApi = require('../api/bean');
const brandApi = require('../api/brand');
const flavorApi = require('../api/flavor');
const statsApi = require('../api/stats');
const userApi = require('../api/user');
const adminApi = require('../api/admin');

test('排序：在喝>养豆中>抓紧喝>喝完', async () => {
  const list = await beanApi.listBeans({});
  assert.equal(list[0].statusInfo.status, 'drinking');
  assert.equal(list[list.length - 1].statusInfo.status, 'finished');
});
test('在喝筛选不含抓紧喝；hurry 专项', async () => {
  const d = await beanApi.listBeans({ status: 'drinking' });
  assert.ok(d.every((b) => b.statusInfo.status === 'drinking'));
  const h = await beanApi.listBeans({ status: 'hurry' });
  assert.equal(h.length, 1); assert.equal(h[0]._id, 'bean03');
});
test('关键词命中品牌/豆种/国家', async () => {
  const r = await beanApi.listBeans({ keyword: 'Blue' });
  assert.equal(r.length, 1); assert.equal(r[0]._id, 'bean01');
});
test('beanView 视图字段', async () => {
  const b = await beanApi.getBean('bean01');
  assert.equal(b.flag, '🇪🇹'); assert.equal(b.brand, 'Blue Bottle');
  assert.ok(b.statusText.includes('还需')); assert.equal(b.flavors.length, 3);
});
test('setBeanStatus 开喝→覆盖→还原', async () => {
  const b = await beanApi.setBeanStatus('bean01', 'drinking');
  assert.equal(b.statusInfo.status, 'drinking'); assert.ok(b.statusText.startsWith('200g'));
  const r = await beanApi.setBeanStatus('bean01', 'auto');
  assert.equal(r.statusInfo.status, 'resting'); assert.equal(r.statusInfo.daysLeft, 10);
});
test('createBean 默认字段', async () => {
  const b = await beanApi.createBean({ brandId: 'b01', name: '测试豆', country: '中国', origin: '保山',
    variety: '', process: '水洗', altitude: '', roastLevel: '中', brewMethod: '手冲', weight: 200,
    roastDate: '2026-09-01', flavorTagIds: [], flavorDesc: '', photos: [] });
  assert.equal(b.isNew, true); assert.ok(b.inDate);
});
test('getBrand beans+均分', async () => {
  const r = await brandApi.getBrand('b03');
  assert.equal(r.beans.length, 1); assert.equal(r.avgScore, '4.5');
});
test('removeFlavor 被引用拒绝', async () => {
  await assert.rejects(() => flavorApi.removeFlavor('f01'), /IN_USE/);
});
test('stats 聚合', async () => {
  const s = await statsApi.getStats();
  assert.equal(s.statusDist.hurry, 1); assert.equal(s.statusDist.finished, 1);
  assert.ok(s.countryDist.find((c) => c.name === '埃塞俄比亚' && c.count === 2));
  assert.equal(s.totalWeight, 550); // 200+100+250，喝完不计
});
test('joinFamily 错码拒绝；模型配置可写', async () => {
  await assert.rejects(() => userApi.joinFamily('XXXXXX'), /BAD_CODE/);
  const cfg = await adminApi.updateModelConfig({ modelVision: 'ep-test-1' });
  assert.equal(cfg.modelVision, 'ep-test-1');
});
test('createBrand/createFlavor 落内存列表（契约）', async () => {
  const brand = await brandApi.createBrand({ name: '测试品牌', country: '中国' });
  assert.equal(brand.isBuiltin, false); assert.ok(brand.flag);
  const brands = await brandApi.listBrands({});
  const hit = brands.find((b) => b._id === brand._id);
  assert.ok(hit); assert.equal(hit.beanCount, 0); assert.equal(hit.name, '测试品牌');
  const flavor = await flavorApi.createFlavor({ name: '测试风味', category: '其他' });
  assert.equal(flavor.emoji, '☕');
  const flavors = await flavorApi.listFlavors();
  const other = flavors.find((g) => g.category === '其他');
  assert.ok(other.items.find((f) => f._id === flavor._id && f.name === '测试风味'));
});

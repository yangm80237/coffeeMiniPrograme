// api/brand.js —— listBrands 内联 beanCount（跨 api 调 beanApi.listBeans）；getBrand 均分内联求均值
// 缓存：cloud 模式下品牌全量列表 TTL 5min（wx.Storage），写操作（create/update/delete）立即失效；mock 模式不走缓存
const { enabled, call } = require('./cloud');
const beanApi = require('./bean');
const { getFlag } = require('./flags');
const BRANDS = require('../mock/brands');
const clone = (x) => JSON.parse(JSON.stringify(x));
const withFlag = (b) => ({ ...b, flag: getFlag(b.country) });

const CACHE_KEY = 'brandListCache_v1';
const CACHE_TTL = 5 * 60 * 1000;

function readCache() {
  try {
    const c = wx.getStorageSync(CACHE_KEY);
    if (c && Array.isArray(c.data) && Date.now() - c.ts < CACHE_TTL) return c.data;
  } catch (e) {}
  return null;
}
function writeCache(data) {
  try { wx.setStorageSync(CACHE_KEY, { ts: Date.now(), data }); } catch (e) {}
}
function clearCache() {
  try { wx.removeStorageSync(CACHE_KEY); } catch (e) {}
}

function listBrands({ countries = [] } = {}) {
  if (enabled()) {
    if (!countries.length) {
      const cached = readCache();
      if (cached) return Promise.resolve(clone(cached));
      return call('brand', { action: 'list' }).then((list) => { writeCache(list); return list; });
    }
    return call('brand', { action: 'list', countries });
  }
  return beanApi.listBeans({}).then((beans) => {
    let list = BRANDS.map((b) => ({ ...clone(b), beanCount: beans.filter((x) => x.brandId === b._id).length }));
    if (countries.length) list = list.filter((b) => countries.includes(b.country));
    return list;
  });
}
function getBrand(id) {
  if (enabled()) return call('brand', { action: 'get', id });
  const brand = BRANDS.find((b) => b._id === id);
  if (!brand) return Promise.reject(new Error('NOT_FOUND'));
  return beanApi.listBeans({}).then((beans) => {
    const brandBeans = beans.filter((b) => b.brandId === id);
    // 均分=该品牌豆两人评分合并求均值（不改 utils/format.avgScore 双参签名）
    const ratings = brandBeans.flatMap((b) => [b.myRating, b.wifeRating]).filter((x) => typeof x === 'number');
    const avgScore = ratings.length ? (ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(1) : '';
    return { brand: clone(brand), beans: brandBeans.map(clone), avgScore };
  });
}
function createBrand({ name, nameEn, aliases, logo, country, description } = {}) {
  if (enabled()) return call('brand', { action: 'create', name, nameEn, aliases, logo, country, description })
    .then((r) => { clearCache(); return r; });
  const b = { _id: 'b' + Date.now(), name: name || '', nameEn: nameEn || '', aliases: Array.isArray(aliases) ? aliases : [],
    logo: logo || '', country: country || '', flag: getFlag(country || ''), description: description || '', isBuiltin: false };
  BRANDS.unshift(b);
  return Promise.resolve(withFlag(b));
}
function updateBrand(id, patch = {}) {
  if (enabled()) return call('brand', { action: 'update', id, patch })
    .then((r) => { clearCache(); return r; });
  const idx = BRANDS.findIndex((b) => b._id === id);
  if (idx < 0) return Promise.reject(new Error('NOT_FOUND'));
  BRANDS[idx] = { ...BRANDS[idx], ...patch };
  return Promise.resolve(withFlag(BRANDS[idx]));
}
function deleteBrand(id) {
  if (enabled()) return call('brand', { action: 'delete', id })
    .then((r) => { clearCache(); return r; });
  const idx = BRANDS.findIndex((b) => b._id === id);
  if (idx < 0) return Promise.reject(new Error('NOT_FOUND'));
  if (BRANDS[idx].isBuiltin) return Promise.reject(new Error('BUILTIN_PROTECTED'));
  BRANDS.splice(idx, 1);
  return Promise.resolve({ ok: true });
}
module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand };

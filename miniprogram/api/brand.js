// api/brand.js —— listBrands 内联 beanCount（跨 api 调 beanApi.listBeans）；getBrand 均分内联求均值
const { enabled, call } = require('./cloud');
const beanApi = require('./bean');
const { getFlag } = require('./flags');
const BRANDS = require('../mock/brands');
const clone = (x) => JSON.parse(JSON.stringify(x));

function listBrands({ countries = [] } = {}) {
  if (enabled()) return call('brand', { action: 'list', countries });
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
function createBrand({ name, nameEn, logo, country, description } = {}) {
  if (enabled()) return call('brand', { action: 'create', name, nameEn, logo, country, description });
  const b = { _id: 'b' + Date.now(), name: name || '', nameEn: nameEn || '', logo: logo || '',
    country: country || '', flag: getFlag(country || ''), description: description || '', isBuiltin: false };
  return Promise.resolve(b);
}
module.exports = { listBrands, getBrand, createBrand };

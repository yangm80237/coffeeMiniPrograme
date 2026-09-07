// api/bean.js —— mock 分支；每个函数先判 enabled() 走 call('bean', {action,...})，否则操作内存 MOCK
const { enabled, call } = require('./cloud');
const { computeStatus, statusBarText } = require('../utils/status');
const { getFlag } = require('./flags');
let MOCK = require('../mock/beans').map((x) => ({ ...x }));
const BRANDS = require('../mock/brands');
const FLAVORS = require('../mock/flavors');
const clone = (x) => JSON.parse(JSON.stringify(x));

function decorate(b) {
  const brand = BRANDS.find((x) => x._id === b.brandId) || {};
  const v = clone(b);
  v.flag = getFlag(b.country);
  v.brand = brand.name || '';
  v.brandFlag = brand.flag || '';
  v.statusInfo = computeStatus(b);
  v.statusText = statusBarText(b);
  v.flavors = (b.flavorTagIds || []).map((id) => FLAVORS.find((f) => f._id === id)).filter(Boolean);
  return v;
}
const ORDER = { drinking: 0, resting: 1, hurry: 2, finished: 3 };

function listBeans({ status = 'all', keyword = '' } = {}) {
  if (enabled()) return call('bean', { action: 'list', status, keyword });
  let list = MOCK.map(decorate);
  if (status === 'drinking') list = list.filter((b) => b.statusInfo.status === 'drinking');
  else if (status !== 'all') list = list.filter((b) => b.statusInfo.status === status);
  const k = keyword.trim();
  if (k) list = list.filter((b) => [b.name, b.brand, b.origin, b.variety, b.country].some((s) => s && s.includes(k)));
  list.sort((a, b) => ORDER[a.statusInfo.status] - ORDER[b.statusInfo.status] || (a.roastDate < b.roastDate ? 1 : -1));
  return Promise.resolve(list);
}
function getBean(id) {
  if (enabled()) return call('bean', { action: 'get', id });
  const b = MOCK.find((x) => x._id === id);
  return b ? Promise.resolve(decorate(b)) : Promise.reject(new Error('NOT_FOUND'));
}
function createBean(data) {
  if (enabled()) return call('bean', { action: 'create', data });
  const bean = { ...clone(data), _id: 'bean' + Date.now(), isNew: true, myRating: null, wifeRating: null,
    myNotes: '', wifeNotes: '', inDate: data.inDate || new Date().toISOString().slice(0, 10) };
  MOCK.unshift(bean);
  return Promise.resolve(decorate(bean));
}
function updateBean(id, patch) {
  if (enabled()) return call('bean', { action: 'update', id, patch });
  const i = MOCK.findIndex((x) => x._id === id);
  if (i < 0) return Promise.reject(new Error('NOT_FOUND'));
  MOCK[i] = { ...MOCK[i], ...clone(patch) };
  return Promise.resolve(decorate(MOCK[i]));
}
function removeBean(id) {
  if (enabled()) return call('bean', { action: 'remove', id });
  MOCK = MOCK.filter((x) => x._id !== id);
  return Promise.resolve({ ok: true });
}
function setBeanStatus(id, s) { return updateBean(id, { statusOverride: s === 'auto' ? null : s }); }
module.exports = { listBeans, getBean, createBean, updateBean, removeBean, setBeanStatus };

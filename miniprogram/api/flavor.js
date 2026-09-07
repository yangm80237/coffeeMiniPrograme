// api/flavor.js —— listFlavors 按分类分组；removeFlavor 先查 beans 引用，被引用 reject IN_USE
const { enabled, call } = require('./cloud');
const FLAVORS = require('../mock/flavors');
const BEANS = require('../mock/beans');
const clone = (x) => JSON.parse(JSON.stringify(x));
const CATEGORY_ORDER = ['水果类', '花香类', '甜感类', '坚果可可类', '香料类', '烘焙类', '其他'];

function listFlavors() {
  if (enabled()) return call('flavor', { action: 'list' });
  const groups = {};
  for (const f of FLAVORS) (groups[f.category] = groups[f.category] || []).push(clone(f));
  return Promise.resolve(CATEGORY_ORDER.map((category) => ({ category, items: groups[category] || [] })));
}
function createFlavor({ name, category } = {}) {
  if (enabled()) return call('flavor', { action: 'create', name, category });
  const f = { _id: 'f' + Date.now(), name: name || '', category: category || '其他', iconUrl: '', emoji: '', isBuiltin: false };
  return Promise.resolve(f);
}
function updateFlavor(id, patch) {
  if (enabled()) return call('flavor', { action: 'update', id, patch });
  const f = FLAVORS.find((x) => x._id === id);
  if (!f) return Promise.reject(new Error('NOT_FOUND'));
  Object.assign(f, clone(patch));
  return Promise.resolve(clone(f));
}
function removeFlavor(id) {
  if (enabled()) return call('flavor', { action: 'remove', id });
  if (BEANS.some((b) => (b.flavorTagIds || []).includes(id))) return Promise.reject(new Error('IN_USE'));
  const i = FLAVORS.findIndex((x) => x._id === id);
  if (i >= 0) FLAVORS.splice(i, 1);
  return Promise.resolve({ ok: true });
}
module.exports = { listFlavors, createFlavor, updateFlavor, removeFlavor };

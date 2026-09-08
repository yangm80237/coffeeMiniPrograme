// bean 云函数——豆子 CRUD + 服务端装饰（契约：miniprogram/api/bean.js）
// 状态计算必须在服务端（computeStatus/statusBarText），前端不传 status
// 错误码：NO_FAMILY / NOT_FOUND
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { computeStatus, statusBarText } = require('./utils/status');
const { getFlag } = require('./utils/flags');

const ORDER = { drinking: 0, resting: 1, hurry: 2, finished: 3 };
const WHITELIST = ['name', 'brandId', 'country', 'origin', 'variety', 'process', 'altitude', 'weight',
  'roastLevel', 'brewMethod', 'roastDate', 'flavorTagIds', 'flavorDesc', 'photos', 'statusOverride',
  'myRating', 'wifeRating', 'myNotes', 'wifeNotes']; // brandId 由确认页选择写入；brand 名服务端按 brandId 派生，不存

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

// 内置（familyId:null 或字段不存在）∪ 本家庭自建；bean 只查自家 familyId
const builtinOrMine = (familyId) => _.or([{ familyId }, { familyId: _.exists(false) }, { familyId: null }]);

async function loadBrands(familyId) {
  const r = await db.collection('brands').where(builtinOrMine(familyId)).limit(1000).get();
  const map = {};
  for (const b of r.data) map[b._id] = b;
  return map;
}
async function loadFlavors(familyId) {
  const r = await db.collection('flavor_tags').where(builtinOrMine(familyId)).limit(1000).get();
  const map = {};
  for (const f of r.data) map[f._id] = f;
  return map;
}

// 视图装饰与 api/bean.js decorate 一致：flag/brand/brandFlag/statusInfo/statusText/flavors
function decorate(b, brandMap, flavorMap) {
  const brand = brandMap[b.brandId] || {};
  return {
    ...b,
    flag: getFlag(b.country),
    brand: brand.name || '',
    brandFlag: brand.name ? getFlag(brand.country) : '',
    statusInfo: computeStatus(b),
    statusText: statusBarText(b),
    flavors: (b.flavorTagIds || []).map((id) => flavorMap[id]).filter(Boolean),
  };
}

async function getFamilyBean(id, familyId) {
  const r = await db.collection('beans').doc(id).get().catch(() => null);
  if (!r || !r.data || r.data.familyId !== familyId) throw new Error('NOT_FOUND');
  return r.data;
}

async function updateBean(id, familyId, patchIn) {
  const bean = await getFamilyBean(id, familyId);
  const patch = {};
  const updated = { ...bean };
  for (const k of WHITELIST) {
    if (patchIn[k] === undefined) continue;
    // statusOverride null 约定：'auto'/null → 移除字段，回落自动状态
    if (k === 'statusOverride' && (patchIn[k] === 'auto' || patchIn[k] === null)) {
      patch.statusOverride = _.remove();
      delete updated.statusOverride;
      continue;
    }
    patch[k] = patchIn[k];
    updated[k] = patchIn[k];
  }
  if (Object.keys(patch).length) await db.collection('beans').doc(id).update({ data: patch });
  return updated;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'list': {
      const { familyId } = await requireFamily(OPENID);
      const status = event.status || 'all';
      const keyword = (event.keyword || '').trim();
      const [brandMap, flavorMap] = await Promise.all([loadBrands(familyId), loadFlavors(familyId)]);
      const r = await db.collection('beans').where({ familyId }).limit(1000).get();
      let list = r.data.map((b) => decorate(b, brandMap, flavorMap));
      if (status === 'drinking') list = list.filter((b) => b.statusInfo.status === 'drinking');
      else if (status !== 'all') list = list.filter((b) => b.statusInfo.status === status);
      if (keyword) {
        list = list.filter((b) => [b.name, b.brand, b.origin, b.variety, b.country]
          .some((s) => s && s.includes(keyword)));
      }
      list.sort((a, b) => ORDER[a.statusInfo.status] - ORDER[b.statusInfo.status]
        || (a.roastDate < b.roastDate ? 1 : -1));
      return list;
    }
    case 'get': {
      const { familyId } = await requireFamily(OPENID);
      const bean = await getFamilyBean(event.id, familyId);
      const [brandMap, flavorMap] = await Promise.all([loadBrands(familyId), loadFlavors(familyId)]);
      return decorate(bean, brandMap, flavorMap);
    }
    case 'create': {
      const { familyId } = await requireFamily(OPENID);
      const data = event.data || {};
      const doc = {
        ...data,
        familyId,
        _openid: OPENID,
        isNew: true,
        myRating: null,
        wifeRating: null,
        myNotes: '',
        wifeNotes: '',
        inDate: data.inDate || new Date().toISOString().slice(0, 10),
      };
      const r = await db.collection('beans').add({ data: doc });
      const [brandMap, flavorMap] = await Promise.all([loadBrands(familyId), loadFlavors(familyId)]);
      return decorate({ ...doc, _id: r._id }, brandMap, flavorMap);
    }
    case 'update': {
      const { familyId } = await requireFamily(OPENID);
      const updated = await updateBean(event.id, familyId, event.patch || {});
      const [brandMap, flavorMap] = await Promise.all([loadBrands(familyId), loadFlavors(familyId)]);
      return decorate(updated, brandMap, flavorMap);
    }
    case 'setBeanStatus': { // api 层走 update；此 action 供直连调用
      const { familyId } = await requireFamily(OPENID);
      const s = event.status;
      const updated = await updateBean(event.id, familyId, { statusOverride: s === 'auto' ? null : s });
      const [brandMap, flavorMap] = await Promise.all([loadBrands(familyId), loadFlavors(familyId)]);
      return decorate(updated, brandMap, flavorMap);
    }
    case 'remove': {
      const { familyId } = await requireFamily(OPENID);
      await getFamilyBean(event.id, familyId);
      await db.collection('beans').doc(event.id).remove();
      return { ok: true };
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

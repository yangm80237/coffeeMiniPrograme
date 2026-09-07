// flavor 云函数——风味标签（契约：miniprogram/api/flavor.js）
// list 按七分类分组；remove 先查 beans.flavorTagIds 引用，被引用 reject IN_USE
// 内置标签（familyId:null，全局共享）不可改删；自建标签限本家庭
// 错误码：NO_FAMILY / NOT_FOUND / IN_USE / FORBIDDEN
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const CATEGORY_ORDER = ['水果类', '花香类', '甜感类', '坚果可可类', '香料类', '烘焙类', '其他'];

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

const builtinOrMine = (familyId) => _.or([{ familyId }, { familyId: _.exists(false) }, { familyId: null }]);

async function getOwnFlavor(id, familyId) {
  const r = await db.collection('flavor_tags').doc(id).get().catch(() => null);
  const f = r && r.data;
  if (!f) throw new Error('NOT_FOUND');
  if (f.isBuiltin || (f.familyId !== familyId)) throw new Error('FORBIDDEN'); // 内置/他人标签不可改删
  return f;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'list': {
      const { familyId } = await requireFamily(OPENID);
      const r = await db.collection('flavor_tags').where(builtinOrMine(familyId)).limit(1000).get();
      const groups = {};
      for (const f of r.data) (groups[f.category] = groups[f.category] || []).push(f);
      const out = CATEGORY_ORDER.map((category) => ({ category, items: groups[category] || [] }));
      for (const category of Object.keys(groups)) { // 用户自建分类追加在七分类之后
        if (!CATEGORY_ORDER.includes(category)) out.push({ category, items: groups[category] });
      }
      return out;
    }
    case 'create': {
      const { familyId } = await requireFamily(OPENID);
      const doc = {
        name: event.name || '',
        category: event.category || '其他',
        iconUrl: '',
        emoji: '☕',
        isBuiltin: false,
        familyId,
        _openid: OPENID,
      };
      const r = await db.collection('flavor_tags').add({ data: doc });
      return { ...doc, _id: r._id };
    }
    case 'update': {
      const { familyId } = await requireFamily(OPENID);
      await getOwnFlavor(event.id, familyId);
      const patch = event.patch || {};
      const data = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.category !== undefined) data.category = patch.category;
      if (patch.iconUrl !== undefined) data.iconUrl = patch.iconUrl;
      if (patch.emoji !== undefined) data.emoji = patch.emoji;
      await db.collection('flavor_tags').doc(event.id).update({ data });
      const saved = await db.collection('flavor_tags').doc(event.id).get();
      return saved.data;
    }
    case 'remove': {
      const { familyId } = await requireFamily(OPENID);
      await getOwnFlavor(event.id, familyId);
      const used = await db.collection('beans').where({ familyId, flavorTagIds: event.id }).count();
      if (used.total > 0) throw new Error('IN_USE');
      await db.collection('flavor_tags').doc(event.id).remove();
      return { ok: true };
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

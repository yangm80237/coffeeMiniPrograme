// user 云函数——家庭与个人资料（契约：miniprogram/api/user.js）
// 错误码：NO_FAMILY / BAD_CODE / FULL / NO_USER（前端按 e.message 消费，故直接 throw）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

async function getMe(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  return r.data[0] || null;
}

// 公共鉴权：无家庭身份一律拒绝业务读写（规格书 3.2）
async function requireFamily(openid) {
  const user = await getMe(openid);
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

async function getFamily(familyId) {
  const r = await db.collection('families').doc(familyId).get().catch(() => null);
  return r && r.data ? r.data : null;
}

// users 文档全量合并写（set）：规避微信云开发 update 的 __evName bug（Cannot create field）
// 保留既有字段，只覆盖 patch 中出现的字段
function mergeUserDoc(me, patch) {
  return {
    _openid: me._openid,
    nickname: me.nickname || '',
    avatarUrl: me.avatarUrl || '',
    familyId: me.familyId || null,
    role: me.role || 'member',
    createdAt: me.createdAt,
    ...patch,
  };
}

async function upsertUser(openid, patch) {
  const me = await getMe(openid);
  if (me) {
    const merged = mergeUserDoc(me, patch);
    await db.collection('users').doc(me._id).set({ data: merged });
    return merged;
  }
  const doc = { _openid: openid, nickname: '', avatarUrl: '', ...patch, createdAt: db.serverDate() };
  const r = await db.collection('users').add({ data: doc });
  return { ...doc, _id: r._id };
}

const familyView = (f) => ({ _id: f._id, inviteCode: f.inviteCode, inviteEnabled: f.inviteEnabled });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'bootstrap': { // 例外：无家庭也要返回，页面据此进创建/加入引导
      const user = await getMe(OPENID);
      const family = user && user.familyId ? await getFamily(user.familyId) : null;
      return { user: user || null, family: family ? familyView(family) : null };
    }
    case 'createFamily': {
      const inviteCode = genCode();
      const r = await db.collection('families').add({
        data: { inviteCode, inviteEnabled: true, createdAt: db.serverDate() },
      });
      await upsertUser(OPENID, { familyId: r._id, role: 'owner' });
      return { _id: r._id, inviteCode, inviteEnabled: true };
    }
    case 'joinFamily': {
      const r = await db.collection('families').where({ inviteCode: event.code }).limit(1).get();
      const family = r.data[0];
      if (!family) throw new Error('BAD_CODE');
      const cnt = await db.collection('users').where({ familyId: family._id }).count();
      if (cnt.total >= 2) throw new Error('FULL');
      await upsertUser(OPENID, { familyId: family._id, role: 'member' });
      return familyView(family);
    }
    case 'updateProfile': {
      const me = await getMe(OPENID);
      if (!me) throw new Error('NO_USER');
      const patch = {};
      if (event.nickname !== undefined) patch.nickname = event.nickname;
      if (event.avatarUrl !== undefined) patch.avatarUrl = event.avatarUrl;
      await db.collection('users').doc(me._id).set({ data: mergeUserDoc(me, patch) });
      return { ...me, ...patch };
    }
    case 'setInviteEnabled': {
      const { familyId } = await requireFamily(OPENID);
      await db.collection('families').doc(familyId).update({ data: { inviteEnabled: !!event.bool } });
      return familyView(await getFamily(familyId));
    }
    case 'regenerateInvite': {
      const { familyId } = await requireFamily(OPENID);
      const inviteCode = genCode();
      await db.collection('families').doc(familyId).update({ data: { inviteCode } });
      return familyView(await getFamily(familyId));
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

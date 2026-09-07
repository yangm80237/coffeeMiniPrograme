// api/user.js —— 家庭与个人资料；错误码 BAD_CODE/FULL（规格书 3.2 家庭系统）
const { enabled, call } = require('./cloud');
const F = require('../mock/family');
const clone = (x) => JSON.parse(JSON.stringify(x));

let CURRENT_OPENID = F.MOCK_SELF_OPENID;
let USERS = F.users.map((x) => ({ ...x }));
let FAMILY = { ...F.family };

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function bootstrap() {
  if (enabled()) return call('user', { action: 'bootstrap' });
  const user = USERS.find((u) => u._openid === CURRENT_OPENID) || null;
  return Promise.resolve({ user: user ? clone(user) : null, family: FAMILY ? clone(FAMILY) : null });
}
function createFamily() {
  if (enabled()) return call('user', { action: 'createFamily' });
  FAMILY = { _id: 'fam' + Date.now(), inviteCode: genCode(), inviteEnabled: true };
  const me = USERS.find((u) => u._openid === CURRENT_OPENID);
  if (me) { me.role = 'owner'; me.familyId = FAMILY._id; }
  return Promise.resolve(clone(FAMILY));
}
function joinFamily(code) {
  if (enabled()) return call('user', { action: 'joinFamily', code });
  if (code !== FAMILY.inviteCode) return Promise.reject(new Error('BAD_CODE'));
  if (USERS.filter((u) => u.familyId === FAMILY._id).length >= 2) return Promise.reject(new Error('FULL'));
  const me = USERS.find((u) => u._openid === CURRENT_OPENID);
  if (me) { me.role = 'member'; me.familyId = FAMILY._id; }
  return Promise.resolve(clone(FAMILY));
}
function updateProfile({ nickname, avatarUrl } = {}) {
  if (enabled()) return call('user', { action: 'updateProfile', nickname, avatarUrl });
  const me = USERS.find((u) => u._openid === CURRENT_OPENID);
  if (!me) return Promise.reject(new Error('NO_USER'));
  if (nickname !== undefined) me.nickname = nickname;
  if (avatarUrl !== undefined) me.avatarUrl = avatarUrl;
  return Promise.resolve(clone(me));
}
function setInviteEnabled(bool) {
  if (enabled()) return call('user', { action: 'setInviteEnabled', bool });
  FAMILY.inviteEnabled = !!bool;
  return Promise.resolve(clone(FAMILY));
}
function regenerateInvite() {
  if (enabled()) return call('user', { action: 'regenerateInvite' });
  FAMILY.inviteCode = genCode();
  return Promise.resolve(clone(FAMILY));
}
module.exports = { bootstrap, createFamily, joinFamily, updateProfile, setInviteEnabled, regenerateInvite };

// admin 云函数——Ark 模型 ID 维护 + 配置开关（契约：miniprogram/api/admin.js，action 为 getConfig/updateConfig）
// 错误码：NO_FAMILY / FORBIDDEN
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

async function readArk() {
  const r = await db.collection('config').doc('ark').get().catch(() => null);
  return r && r.data ? r.data : null;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'getConfig': {
      const ark = await readArk();
      if (ark) {
        return {
          modelVision: ark.modelVision || '', modelImage: ark.modelImage || '',
          autoIcon: ark.autoIcon !== false, source: 'config', // 缺省 true
        };
      }
      return { // 无 config 文档回退云函数环境变量
        modelVision: process.env.ARK_MODEL_VISION || '',
        modelImage: process.env.ARK_MODEL_IMAGE || '',
        autoIcon: true,
        source: 'fallback',
      };
    }
    case 'updateConfig': {
      const { role } = await requireFamily(OPENID);
      if (role !== 'owner') throw new Error('FORBIDDEN');
      const patch = event.patch || {};
      const data = {};
      if (patch.modelVision !== undefined) data.modelVision = patch.modelVision;
      if (patch.modelImage !== undefined) data.modelImage = patch.modelImage;
      if (patch.autoIcon !== undefined) data.autoIcon = !!patch.autoIcon;
      const ark = await readArk();
      if (ark) await db.collection('config').doc('ark').update({ data });
      else await db.collection('config').add({ data: { _id: 'ark', ...data } });
      const saved = await readArk();
      return {
        modelVision: saved.modelVision || '', modelImage: saved.modelImage || '',
        autoIcon: saved.autoIcon !== false, source: 'config',
      };
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

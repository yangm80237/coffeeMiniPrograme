// stats 云函数——库存聚合（契约：miniprogram/api/stats.js 的 aggregate 口径）
// totalWeight 排除 finished（规格书 3.8）；countryDist 带 flag 按计数降序；varietyDist 降序
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { computeStatus } = require('./utils/status');
const { getFlag } = require('./utils/flags');

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

// 与 miniprogram/api/stats.js aggregate 逐字段一致
function aggregate(beans) {
  const statusDist = { resting: 0, drinking: 0, hurry: 0, finished: 0 };
  const processDist = {};
  const countryMap = {};
  const varietyMap = {};
  let totalWeight = 0;
  for (const b of beans) {
    const s = computeStatus(b);
    statusDist[s.status]++;
    if (s.status !== 'finished') totalWeight += b.weight || 0; // 喝完不计
    if (b.process) processDist[b.process] = (processDist[b.process] || 0) + 1;
    if (b.country) countryMap[b.country] = (countryMap[b.country] || 0) + 1;
    if (b.variety) varietyMap[b.variety] = (varietyMap[b.variety] || 0) + 1;
  }
  const countryDist = Object.entries(countryMap)
    .map(([name, count]) => ({ name, flag: getFlag(name), count }))
    .sort((a, b) => b.count - a.count);
  const varietyDist = Object.entries(varietyMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return {
    totalWeight,
    brandCount: new Set(beans.map((b) => b.brandId).filter(Boolean)).size,
    countryCount: Object.keys(countryMap).length,
    varietyCount: Object.keys(varietyMap).length,
    statusDist, processDist, countryDist, varietyDist,
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'get': {
      const { familyId } = await requireFamily(OPENID);
      const r = await db.collection('beans').where({ familyId }).limit(1000).get();
      return aggregate(r.data);
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

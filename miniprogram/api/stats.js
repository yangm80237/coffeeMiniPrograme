// api/stats.js —— 聚合纯函数 aggregate(beans) 导出；getStats 读 mock 快照（CRUD 不污染统计）
const { enabled, call } = require('./cloud');
const { computeStatus } = require('../utils/status');
const { getFlag } = require('./flags');

function aggregate(beans) {
  const statusDist = { resting: 0, drinking: 0, hurry: 0, finished: 0 };
  const processDist = {};
  const countryMap = {};
  const varietyMap = {};
  let totalWeight = 0;
  for (const b of beans) {
    const s = computeStatus(b);
    statusDist[s.status]++;
    if (s.status !== 'finished') totalWeight += b.weight || 0; // 喝完不计（规格书 3.8）
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
    totalWeight, brandCount: new Set(beans.map((b) => b.brandId).filter(Boolean)).size,
    countryCount: Object.keys(countryMap).length, varietyCount: Object.keys(varietyMap).length,
    statusDist, processDist, countryDist, varietyDist,
  };
}

function getStats() {
  if (enabled()) return call('stats', { action: 'get' });
  const beans = require('../mock/beans').map((x) => ({ ...x }));
  return Promise.resolve(aggregate(beans));
}
module.exports = { getStats, aggregate };

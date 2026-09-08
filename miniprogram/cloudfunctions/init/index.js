// init 云函数——幂等种子（DevTools 云函数测试面板手动运行一次；重复运行不重复插入）
// 数据源 = miniprogram/mock/brands.js（12 品牌）与 mock/flavors.js（45 风味），已复制进 ./seed/
// brands/flavor_tags 内置数据 familyId:null（全局可读）；config 无 _id:'ark' 文档则建默认值
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const BUILTIN_BRANDS = require('./seed/brands');
const BUILTIN_FLAVORS = require('./seed/flavors');

// flag 为 mock 便利字段，云端由 getFlag(country) 派生，不落库
const stripFlag = ({ flag, ...rest }) => rest;

async function seedBuiltins(collection, docs) {
  // 一次查全量内置名 → 过滤 → 一次批量插入（服务端 add 支持数组）
  // 旧版逐条 await 在 3s 默认超时内必然超时（57条×2往返），此为超时修复
  const exist = await db.collection(collection)
    .where({ isBuiltin: true })
    .field({ name: true })
    .limit(1000)
    .get();
  const names = new Set(exist.data.map((d) => d.name));
  const fresh = docs
    .filter((raw) => !names.has(raw.name))
    .map((raw) => ({ ...stripFlag(raw), isBuiltin: true, familyId: null }));
  if (fresh.length) await db.collection(collection).add({ data: fresh });
  return fresh.length;
}

exports.main = async (event) => {
  const action = event.action || 'seed';
  if (action !== 'seed') throw new Error('UNKNOWN_ACTION');
  const brandsInserted = await seedBuiltins('brands', BUILTIN_BRANDS);
  const flavorsInserted = await seedBuiltins('flavor_tags', BUILTIN_FLAVORS);
  const ark = await db.collection('config').doc('ark').get().catch(() => null);
  if (!ark || !ark.data) {
    await db.collection('config').add({
      data: { _id: 'ark', modelVision: 'doubao-seed-2-0-lite-260428', modelImage: 'doubao-seedream-5-0-260128' },
    });
  }
  return { brandsInserted, flavorsInserted };
};

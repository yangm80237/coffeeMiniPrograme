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
  let inserted = 0;
  for (const raw of docs) {
    const doc = stripFlag(raw);
    const hit = await db.collection(collection)
      .where({ name: doc.name, isBuiltin: true }).count();
    if (hit.total > 0) continue; // 按 name+isBuiltin 查重，幂等
    await db.collection(collection).add({ data: { ...doc, isBuiltin: true, familyId: null } });
    inserted++;
  }
  return inserted;
}

exports.main = async (event) => {
  const action = event.action || 'seed';
  if (action !== 'seed') throw new Error('UNKNOWN_ACTION');
  const brandsInserted = await seedBuiltins('brands', BUILTIN_BRANDS);
  const flavorsInserted = await seedBuiltins('flavor_tags', BUILTIN_FLAVORS);
  const ark = await db.collection('config').doc('ark').get().catch(() => null);
  if (!ark || !ark.data) {
    await db.collection('config').add({
      data: { _id: 'ark', modelVision: 'doubao-seed-1.6', modelImage: 'doubao-seedream-4.0' },
    });
  }
  return { brandsInserted, flavorsInserted };
};

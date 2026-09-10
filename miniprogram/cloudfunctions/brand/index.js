// brand 云函数——品牌列表/详情/自建（契约：miniprogram/api/brand.js）
// 列表 = 内置（familyId:null）∪ 本家庭自建，联 beans 计 beanCount；get 返回 {brand, beans, avgScore}
// 错误码：NO_FAMILY / NOT_FOUND
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { computeStatus, statusBarText } = require('./utils/status');
const { getFlag } = require('./utils/flags');

async function requireFamily(openid) {
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get();
  const user = r.data[0];
  if (!user || !user.familyId) throw new Error('NO_FAMILY');
  return { user, familyId: user.familyId, role: user.role };
}

const builtinOrMine = (familyId) => _.or([{ familyId }, { familyId: _.exists(false) }, { familyId: null }]);

function decorate(b, flavorMap) {
  return {
    ...b,
    statusInfo: computeStatus(b),
    statusText: statusBarText(b),
    flavors: (b.flavorTagIds || []).map((id) => flavorMap[id]).filter(Boolean),
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  switch (event.action) {
    case 'list': {
      const { familyId } = await requireFamily(OPENID);
      const [br, beanRes] = await Promise.all([
        db.collection('brands').where(builtinOrMine(familyId)).limit(1000).get(),
        db.collection('beans').where({ familyId }).limit(1000).get(),
      ]);
      const beans = beanRes.data;
      let list = br.data.map((b) => ({
        ...b,
        flag: getFlag(b.country),
        beanCount: beans.filter((x) => x.brandId === b._id).length,
      }));
      const countries = event.countries || [];
      if (countries.length) list = list.filter((b) => countries.includes(b.country));
      return list;
    }
    case 'get': {
      const { familyId } = await requireFamily(OPENID);
      const r = await db.collection('brands').doc(event.id).get().catch(() => null);
      const brand = r && r.data;
      if (!brand) throw new Error('NOT_FOUND');
      if (!(brand.familyId === undefined || brand.familyId === null || brand.familyId === familyId)) {
        throw new Error('NOT_FOUND');
      }
      const [fr, beanRes] = await Promise.all([
        db.collection('flavor_tags').where(builtinOrMine(familyId)).limit(1000).get(),
        db.collection('beans').where({ familyId, brandId: event.id }).limit(1000).get(),
      ]);
      const flavorMap = {};
      for (const f of fr.data) flavorMap[f._id] = f;
      const brandBeans = beanRes.data.map((b) => decorate(b, flavorMap));
      // 均分 = 该品牌豆两人评分合并求均值（口径同 api/brand.js getBrand）
      const ratings = brandBeans.flatMap((b) => [b.myRating, b.wifeRating])
        .filter((x) => typeof x === 'number');
      const avgScore = ratings.length
        ? (ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(1) : '';
      return { brand: { ...brand, flag: getFlag(brand.country) }, beans: brandBeans, avgScore };
    }
    case 'create': {
      const { familyId } = await requireFamily(OPENID);
      const doc = {
        name: event.name || '',
        nameEn: event.nameEn || '',
        aliases: Array.isArray(event.aliases) ? event.aliases : [],
        logo: event.logo || '',
        country: event.country || '',
        description: event.description || '',
        isBuiltin: false,
        familyId,
        _openid: OPENID,
      };
      const r = await db.collection('brands').add({ data: doc });
      return { ...doc, _id: r._id, flag: getFlag(doc.country) };
    }
    case 'update': {
      // 编辑品牌：patch 白名单字段（name/nameEn/aliases/logo/country/description）
      const { familyId } = await requireFamily(OPENID);
      const r = await db.collection('brands').doc(event.id).get().catch(() => null);
      const brand = r && r.data;
      if (!brand) throw new Error('NOT_FOUND');
      if (!(brand.familyId === undefined || brand.familyId === null || brand.familyId === familyId)) {
        throw new Error('NOT_FOUND');
      }
      const p = event.patch || {};
      const data = {};
      if (p.name !== undefined) data.name = String(p.name || '').trim();
      if (p.nameEn !== undefined) data.nameEn = String(p.nameEn || '').trim();
      if (p.aliases !== undefined) {
        data.aliases = Array.isArray(p.aliases)
          ? p.aliases.map((a) => String(a || '').trim()).filter(Boolean)
          : [];
      }
      if (p.logo !== undefined) data.logo = p.logo || '';
      if (p.country !== undefined) data.country = String(p.country || '').trim();
      if (p.description !== undefined) data.description = String(p.description || '').trim();
      await db.collection('brands').doc(event.id).update({ data });
      return { ...brand, ...data, flag: getFlag(data.country !== undefined ? data.country : brand.country) };
    }
    case 'delete': {
      // 仅本家庭自建品牌可删；内置品牌受保护；关联豆子的 brandId 清空（悬空品牌）
      const { familyId } = await requireFamily(OPENID);
      const r = await db.collection('brands').doc(event.id).get().catch(() => null);
      const brand = r && r.data;
      if (!brand) throw new Error('NOT_FOUND');
      if (brand.isBuiltin) throw new Error('BUILTIN_PROTECTED');
      if (brand.familyId !== familyId) throw new Error('NOT_FOUND');
      await Promise.all([
        db.collection('brands').doc(event.id).remove(),
        db.collection('beans').where({ familyId, brandId: event.id }).update({ data: { brandId: '' } }),
      ]);
      return { ok: true };
    }
    default:
      throw new Error('UNKNOWN_ACTION');
  }
};

// 品牌库列表——国家多选筛选（🚩 下拉）+ 搜索（原型 screen-brand 1166–1297）
const brandApi = require('../../api/brand');
const { getFlag } = require('../../api/flags');
const { firstChar } = require('../../utils/format');

// logo 首字色块渐变池（原型同款色系）
const GRADS = [
  'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f6d365,#fda085)',
  'linear-gradient(135deg,#11998e,#38ef7d)', 'linear-gradient(135deg,#0f2027,#2c5364)',
  'linear-gradient(135deg,#ee9ca7,#ffdde1)', 'linear-gradient(135deg,#606c88,#3f4c6b)',
  'linear-gradient(135deg,#a8c0ff,#3f2b96)', 'linear-gradient(135deg,#f7971e,#ffd200)',
  'linear-gradient(135deg,#e8a87c,#c96f4a)', 'linear-gradient(135deg,#b74d4d,#7c2f2f)',
  'linear-gradient(135deg,#4d9e6a,#2f7c4f)', 'linear-gradient(135deg,#c9a227,#8a6d1a)',
];
const gradOf = (name) => {
  let h = 0;
  for (const ch of String(name || '')) h += ch.codePointAt(0);
  return GRADS[h % GRADS.length];
};

Page({
  data: { brands: [], countries: [], flags: {}, picked: {}, filterOpen: false, keyword: '' },
  onLoad() {
    brandApi.listBrands({}).then((all) => {
      const countries = [...new Set(all.map((b) => b.country))].sort();
      const flags = {};
      countries.forEach((c) => { flags[c] = getFlag(c); });
      this.setData({ all, countries, flags });
    });
  },
  onShow() { this.refresh(); },
  refresh() {
    const cs = Object.keys(this.data.picked).filter((k) => this.data.picked[k]);
    return brandApi.listBrands({ countries: cs }).then((brands) => {
      const kw = (this.data.keyword || '').trim().toLowerCase();
      if (kw) {
        brands = brands.filter((b) => ((b.name || '') + (b.nameEn || '')).toLowerCase().includes(kw));
      }
      this.setData({
        brands: brands.map((b) => ({
          ...b, flag: b.flag || getFlag(b.country), first: firstChar(b.name), grad: gradOf(b.name),
        })),
      });
    });
  },
  toggleFilter() { this.setData({ filterOpen: !this.data.filterOpen }); },
  toggleCountry(e) {
    const k = e.currentTarget.dataset.c;
    this.setData({ ['picked.' + k]: !this.data.picked[k] }, () => this.refresh());
  },
  clearFilter() { this.setData({ picked: {}, filterOpen: false }, () => this.refresh()); },
  onKeyword(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()); },
  goAdd() { wx.navigateTo({ url: '/pages/brand/add' }); },
  goDetail(e) { wx.navigateTo({ url: '/pages/brand/detail?id=' + e.currentTarget.dataset.id }); },
});

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
  onShow() { this.refresh(); },
  refresh() {
    // 全量走 api 层 TTL 缓存（5min），筛选/搜索在本地做，秒开且不发重复云请求
    return brandApi.listBrands({}).then((all) => {
      if (!this.data.countries.length) {
        const countries = [...new Set(all.map((b) => b.country))].sort();
        const flags = {};
        countries.forEach((c) => { flags[c] = getFlag(c); });
        this.setData({ countries, flags });
      }
      const cs = Object.keys(this.data.picked).filter((k) => this.data.picked[k]);
      const kw = (this.data.keyword || '').trim().toLowerCase();
      let brands = all;
      if (cs.length) brands = brands.filter((b) => cs.includes(b.country));
      if (kw) brands = brands.filter((b) => ((b.name || '') + (b.nameEn || '')).toLowerCase().includes(kw));
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
  onLongPress(e) {
    const { id, name, builtin } = e.currentTarget.dataset;
    if (builtin) return wx.showToast({ title: '内置品牌不可删除', icon: 'none' });
    wx.showModal({
      title: '删除品牌',
      content: '确定删除「' + name + '」吗？关联的豆子将变为「未关联品牌」。',
      confirmColor: '#E5484D',
      success: (r) => {
        if (!r.confirm) return;
        brandApi.deleteBrand(id).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' });
          this.refresh();
        });
      },
    });
  },
});

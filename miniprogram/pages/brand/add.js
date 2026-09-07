// 新增品牌——Logo 上传 + 国家快捷 chips（原型 screen-brand-add 1298–1328）
const brandApi = require('../../api/brand');
const { COUNTRIES, getFlag } = require('../../api/flags');

// 国旗 emoji（Regional Indicator 双码）前缀剥离：chips 以「🇨🇳 中国」形式填入
function stripFlag(s) {
  return (s || '').replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '').trim();
}

Page({
  data: { logo: '', name: '', country: '', description: '' },
  onLoad() {
    // 国旗快捷 chips：COUNTRIES 前 8 个，js 预组装 [{v, flag, name}]（wxml 不能调函数）
    const chips = COUNTRIES.slice(0, 8).map((c) => ({ v: getFlag(c) + ' ' + c, flag: getFlag(c), name: c }));
    this.setData({ chips });
  },
  chooseLogo() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: (res) => this.setData({ logo: res.tempFiles[0].tempFilePath }),
    });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onCountry(e) { this.setData({ country: e.detail.value }); },
  pickChip(e) { this.setData({ country: e.currentTarget.dataset.v }); },
  onDesc(e) { this.setData({ description: e.detail.value }); },
  save() {
    const name = (this.data.name || '').trim();
    if (!name) return wx.showToast({ title: '请填写品牌名称', icon: 'none' });
    brandApi.createBrand({
      name, logo: this.data.logo,
      country: stripFlag(this.data.country),
      description: (this.data.description || '').trim(),
    }).then(() => {
      wx.showToast({ title: '已保存' });
      setTimeout(() => wx.navigateBack(), 600);
    });
  },
});

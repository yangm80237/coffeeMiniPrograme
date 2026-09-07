// 品牌详情——logo 大图 / 国旗国家 / 袋数 / 均分 / 该品牌豆子列表（原型 screen-brand-detail 1369–1400）
const brandApi = require('../../api/brand');
const { getFlag } = require('../../api/flags');
const { firstChar } = require('../../utils/format');

Page({
  data: { brand: {}, beans: [], avgScore: '', first: '?' },
  onLoad(options) { this.id = options.id; },
  onShow() { this.refresh(); },
  refresh() {
    return brandApi.getBrand(this.id).then(({ brand, beans, avgScore }) => {
      this.setData({
        brand: { ...brand, flag: brand.flag || getFlag(brand.country) },
        first: firstChar(brand.name),
        beans, avgScore,
      });
    });
  },
  openBean(e) { wx.navigateTo({ url: '/pages/bean/detail?id=' + e.currentTarget.dataset.id }); },
});

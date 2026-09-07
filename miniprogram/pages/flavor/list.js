// 风味标签维护——分组渲染 + 搜索过滤（原型 screen-flavor 1103–1165）
const flavorApi = require('../../api/flavor');

// 分类圆点色（原型水果/花香/甜感/坚果可可四色沿用，香料/烘焙/其他新增页补色）
const DOTS = {
  '水果类': '#EA6668', '花香类': '#C9A7E8', '甜感类': '#F4D48F', '坚果可可类': '#E1B98F',
  '香料类': '#C0846B', '烘焙类': '#8A6D3B', '其他': '#9CA3AF',
};

Page({
  data: { groups: [], total: 0, keyword: '' },
  onShow() { this.refresh(); },
  refresh() {
    return flavorApi.listFlavors().then((gs) => {
      const kw = (this.data.keyword || '').trim().toLowerCase();
      const groups = gs
        .map((g) => ({ category: g.category, dot: DOTS[g.category] || '#9CA3AF',
          items: kw ? g.items.filter((f) => f.name.toLowerCase().includes(kw)) : g.items }))
        .filter((g) => g.items.length);
      const total = gs.reduce((n, g) => n + g.items.length, 0);
      this.setData({ groups, total });
    });
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()); },
  goDetail(e) { wx.navigateTo({ url: '/pages/flavor/detail?id=' + e.currentTarget.dataset.id }); },
  goNew() { wx.navigateTo({ url: '/pages/flavor/detail?mode=new' }); },
});

const beanApi = require('../../api/bean');
const FILTERS = [
  { key: 'all', label: '☕ 全部' }, { key: 'resting', label: '🟡 养豆中' },
  { key: 'drinking', label: '🟢 在喝' }, { key: 'hurry', label: '🟠 抓紧喝' }, { key: 'finished', label: '⚪ 喝完' },
];
Page({
  data: { beans: [], loaded: false, keyword: '', filter: 'all',
    filterOpen: false, menuOpen: false, filters: [], filterLabel: '☕ 全部' },
  onShow() { this.refresh(); },
  refresh() {
    const { filter, keyword } = this.data;
    return beanApi.listBeans({ status: 'all', keyword }).then((beans) => {
      const counts = { all: beans.length, resting: 0, drinking: 0, hurry: 0, finished: 0 };
      beans.forEach((b) => counts[b.statusInfo.status]++);
      const shown = filter === 'all' ? beans : beans.filter((b) => b.statusInfo.status === filter);
      this.setData({ beans: shown, loaded: true,
        filters: FILTERS.map((f) => ({ ...f, count: counts[f.key] })),
        filterLabel: FILTERS.find((f) => f.key === filter).label });
    });
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()); },
  toggleFilter() { this.setData({ filterOpen: !this.data.filterOpen, menuOpen: false }); },
  toggleMenu() { this.setData({ menuOpen: !this.data.menuOpen, filterOpen: false }); },
  pickFilter(e) { this.setData({ filter: e.currentTarget.dataset.k, filterOpen: false }, () => this.refresh()); },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); },
  goStats() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/stats/stats' }); },
  goBrand() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/brand/list' }); },
  goFlavor() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/flavor/list' }); },
  openBean(e) { wx.navigateTo({ url: '/pages/bean/detail?id=' + e.currentTarget.dataset.id }); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
});

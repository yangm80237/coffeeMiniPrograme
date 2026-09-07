const beanApi = require('../../api/bean');
const MAIN_BTN = { resting: { text: '开喝', cls: 'btn-primary' }, drinking: { text: '喝完', cls: 'btn-cream' },
  hurry: { text: '喝完', cls: 'btn-cream' }, finished: { text: '重新养豆', cls: 'btn-muted' } };

Page({
  data: { bean: {}, first: '', mainBtn: {}, moreOpen: false, ratingOpen: false, draft: 0, notes: '' },
  onLoad(options) { this.id = options.id; },
  onShow() { beanApi.getBean(this.id).then((b) =>
    this.setData({ bean: b, mainBtn: MAIN_BTN[b.statusInfo.status] })); },
  goBrand() { wx.navigateTo({ url: '/pages/brand/detail?id=' + this.data.bean.brandId }); },
  goEdit() { this.setData({ moreOpen: false });
    wx.navigateTo({ url: '/pages/add/confirm/confirm?mode=edit&id=' + this.id }); },
  toggleMore() { this.setData({ moreOpen: !this.data.moreOpen }); },
  setHurry() { beanApi.setBeanStatus(this.id, 'hurry').then(() => this.load()); }, // 按钮仅在喝时渲染
  advanceStatus() { // 主按钮一键直达：养豆中→开喝；在喝/抓紧→喝完；喝完→重新养豆
    const s = this.data.bean.statusInfo.status;
    const next = s === 'resting' ? 'drinking' : (s === 'finished' ? 'resting' : 'finished');
    beanApi.setBeanStatus(this.id, next).then(() => this.load()); },
  load() { beanApi.getBean(this.id).then((b) => this.setData({ bean: b, mainBtn: MAIN_BTN[b.statusInfo.status],
    flavorIcons: b.flavors || [], flavorNames: (b.flavors || []).map((f) => f.name).join(' · ') })); },
  openRating() { this.setData({ ratingOpen: true, draft: this.data.bean.myRating || 0, notes: this.data.bean.myNotes || '' }); },
  closeRating() { this.setData({ ratingOpen: false }); },
  rateDraft(e) { this.setData({ draft: e.detail.value }); },
  onNotes(e) { this.setData({ notes: e.detail.value }); },
  saveRating() { beanApi.updateBean(this.id, { myRating: this.data.draft, myNotes: this.data.notes })
    .then(() => { this.setData({ ratingOpen: false }); this.load(); }); },
  confirmDelete() {
    wx.showModal({ title: '删除豆子', content: '删除后不可恢复，确定？', confirmColor: '#E5484D',
      success: (r) => { if (r.confirm) beanApi.removeBean(this.id).then(() => wx.navigateBack()); } });
  },
});

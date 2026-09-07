// 风味标签详情——编辑形态 / 新增形态（mode=new）（原型 screen-flavor-detail 1329–1368）
const flavorApi = require('../../api/flavor');
const beanApi = require('../../api/bean');

const CATEGORIES = ['水果类', '花香类', '甜感类', '坚果可可类', '香料类', '烘焙类', '其他'];

Page({
  data: { mode: 'edit', categories: CATEGORIES, catIndex: 0,
    name: '', emoji: '', iconUrl: '', usage: 0 },
  onLoad(options) {
    if (options.mode === 'new') { this.setData({ mode: 'new' }); return; }
    this.id = options.id;
    flavorApi.listFlavors().then((gs) => {
      for (const g of gs) {
        for (const f of g.items) {
          if (f._id !== this.id) continue;
          this.setData({
            name: f.name, emoji: f.emoji, iconUrl: f.iconUrl,
            catIndex: Math.max(0, CATEGORIES.indexOf(g.category)),
          });
        }
      }
    });
    beanApi.listBeans({}).then((beans) => {
      this.setData({ usage: beans.filter((b) => (b.flavorTagIds || []).includes(this.id)).length });
    });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onCategory(e) { this.setData({ catIndex: Number(e.detail.value) }); },
  regenIcon() { wx.showToast({ title: '阶段④开放', icon: 'none' }); },
  save() {
    const name = (this.data.name || '').trim();
    if (!name) return wx.showToast({ title: '请填写名称', icon: 'none' });
    const category = CATEGORIES[this.data.catIndex];
    if (this.data.mode === 'new') {
      flavorApi.createFlavor({ name, category }).then(() => {
        wx.showToast({ title: '已新增' });
        setTimeout(() => wx.navigateBack(), 600);
      });
    } else {
      flavorApi.updateFlavor(this.id, { name, category }).then(() => {
        wx.showToast({ title: '已保存' });
        setTimeout(() => wx.navigateBack(), 600);
      });
    }
  },
  remove() {
    wx.showModal({
      title: '删除标签',
      content: '确定删除「' + this.data.name + '」吗？',
      confirmColor: '#C96F4A',
      success: (r) => {
        if (!r.confirm) return;
        flavorApi.removeFlavor(this.id).then(() => {
          wx.showToast({ title: '已删除' });
          setTimeout(() => wx.navigateBack(), 600);
        }).catch((e) => wx.showToast({
          title: e.message === 'IN_USE' ? '该风味已被豆子使用，无法删除' : '删除失败', icon: 'none',
        }));
      },
    });
  },
});

// 管理页——模型 ID 维护（视觉/生图），仅 owner 可写（规格书 3.9）
const adminApi = require('../../api/admin');

Page({
  data: { modelVision: '', modelImage: '', source: '', sourceLabel: '' },
  onShow() { this.refresh(); },
  refresh() {
    return adminApi.getModelConfig().then((c) => {
      // source==='env' 为环境变量回退，其余（config/admin 写入）视为 config 集合
      this.setData({
        modelVision: c.modelVision || '', modelImage: c.modelImage || '',
        source: c.source, sourceLabel: c.source === 'env' ? '环境变量回退' : 'config 集合',
      });
    });
  },
  onVision(e) { this.setData({ modelVision: e.detail.value }); },
  onImage(e) { this.setData({ modelImage: e.detail.value }); },
  save() {
    adminApi.updateModelConfig({
      modelVision: (this.data.modelVision || '').trim(),
      modelImage: (this.data.modelImage || '').trim(),
    }).then((c) => {
      this.setData({ source: c.source, sourceLabel: c.source === 'env' ? '环境变量回退' : 'config 集合' });
      wx.showToast({ title: '已保存' });
    }).catch((e) => wx.showToast({
      title: e.message === 'FORBIDDEN' ? '仅家庭创建者可修改' : '保存失败', icon: 'none',
    }));
  },
  testConn() { wx.showToast({ title: '阶段④开放', icon: 'none' }); },
});

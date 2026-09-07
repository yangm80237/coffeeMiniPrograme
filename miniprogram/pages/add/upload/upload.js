Page({
  data: { photos: [], current: 0, from: 'camera' },
  onLoad(options) {
    this.setData({ photos: getApp().globalData.pendingPhotos || [], from: options.from || 'camera' });
  },
  pick(e) { this.setData({ current: e.detail.index }); },
  retake() { wx.navigateBack({ delta: this.data.from === 'album' ? 2 : 1 }); },
  confirmUse() {
    const g = getApp().globalData;
    g.pendingPhotos = this.data.photos; g.mainIndex = this.data.current;
    wx.navigateTo({ url: '/pages/add/processing/processing' });
  },
});

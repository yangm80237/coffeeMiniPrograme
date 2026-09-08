const { navMetrics } = require('../../../utils/nav');

Page({
  data: { photos: [], current: 0, from: 'camera', statusBarPx: 44, navH: 44 },
  onLoad(options) {
    this.setData({ ...(navMetrics()), photos: getApp().globalData.pendingPhotos || [], from: options.from || 'camera' });
  },
  pick(e) { this.setData({ current: e.detail.index }); },
  addMore() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (r) => {
        const next = this.data.photos.concat(r.tempFiles.map((f) => f.tempFilePath));
        this.setData({ photos: next });
      },
    });
  },
  retake() { wx.navigateBack({ delta: this.data.from === 'album' ? 2 : 1 }); },
  confirmUse() {
    const g = getApp().globalData;
    g.pendingPhotos = this.data.photos; g.mainIndex = this.data.current;
    wx.navigateTo({ url: '/pages/add/processing/processing' });
  },
});

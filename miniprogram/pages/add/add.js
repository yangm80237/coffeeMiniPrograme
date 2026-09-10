Page({
  goCamera() {
    wx.navigateTo({ url: '/pages/add/camera/camera' });
  },
  pickAlbum() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (r) => {
        getApp().globalData.pendingPhotos = r.tempFiles.map((f) => f.tempFilePath);
        wx.navigateTo({ url: '/pages/add/upload/upload?from=album' });
      },
    });
  },
  goManual() {
    getApp().globalData.pendingPhotos = null; // 手动录入不带照片；processing 失败转手动时保留照片
    wx.navigateTo({ url: '/pages/add/confirm/confirm?mode=manual' });
  },
  toastSoon() {
    wx.showToast({ title: '阶段④开放', icon: 'none' });
  },
  close() {
    wx.navigateBack();
  },
});

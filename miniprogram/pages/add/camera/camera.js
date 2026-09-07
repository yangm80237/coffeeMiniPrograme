Page({
  onClose() { wx.navigateBack(); }, // 放弃本次添加
  onShutter() {
    wx.createCameraContext().takePhoto({ quality: 'high',
      success: (r) => this.gotoUpload([r.tempImagePath]),
      fail: () => wx.showToast({ title: '拍摄失败，请重试', icon: 'none' }) });
  },
  pickFromAlbum() {
    wx.chooseMedia({ count: 3, mediaType: ['image'], sourceType: ['album'],
      success: (r) => this.gotoUpload(r.tempFiles.map((f) => f.tempFilePath)) });
  },
  gotoUpload(photos) { getApp().globalData.pendingPhotos = photos;
    wx.navigateTo({ url: '/pages/add/upload/upload?from=camera' }); },
});

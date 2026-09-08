const TIPS = ['正在识别品牌…', '正在提取豆名与豆种…', '正在识别产区与处理法…', '正在匹配风味标签…', '整理识别结果，即将完成…'];
const { navMetrics } = require('../../../utils/nav');
const upload = require('../../../api/upload');
const aiApi = require('../../../api/ai');
Page({
  data: { tip: TIPS[0], statusBarPx: 44, navH: 44 },
  onLoad() {
    this.setData(navMetrics());
    this.i = 0;
    this.timer = setInterval(() => { this.i = (this.i + 1) % TIPS.length; this.setData({ tip: TIPS[this.i] }); }, 2000);
    this.run();
  },
  // 真实识别链路：上传照片 → 主图 fileID → 云函数识别；任何失败兜底空表单进确认页
  run() {
    const g = getApp().globalData;
    const photos = g.pendingPhotos || [];
    upload.uploadImages(photos)
      .then((fileIDs) => {
        g.pendingPhotos = fileIDs; // 替换为 fileID 数组：confirm 入库时 uploadImages 直接透传，避免重复上传
        return fileIDs.length ? aiApi.recognizeBean(fileIDs[g.mainIndex] || fileIDs[0]) : null;
      })
      .then((r) => { g.aiResult = (r && r.form) || null; })
      .catch(() => { g.aiResult = null; })
      .then(() => this.go());
  },
  onUnload() { clearInterval(this.timer); this.dead = true; },
  skip() { this.go(); },
  onBack() {
    wx.showModal({
      title: '取消本次识别？',
      content: '识别尚未完成，返回将放弃本次结果（不消耗识别次数）',
      confirmText: '放弃',
      cancelText: '继续等待',
      success: (r) => { if (r.confirm) wx.navigateBack(); },
    });
  },
  go() { // 幂等：识别完成 / 手动跳过 / 页面已卸载只生效一次
    if (this.done || this.dead) return;
    this.done = true;
    clearInterval(this.timer);
    wx.redirectTo({ url: '/pages/add/confirm/confirm?mode=ai' });
  },
});

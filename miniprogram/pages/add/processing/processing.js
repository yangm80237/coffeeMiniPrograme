// 阶段提示（真实进度，非轮播）：随 run() 各异步阶段切换
const PHASES = {
  compressing: '正在压缩图片…',
  uploading: '正在上传照片…',
  recognizing: 'AI 识别中',
  finishing: '正在整理识别结果…',
};
const { navMetrics } = require('../../../utils/nav');
const upload = require('../../../api/upload');
const aiApi = require('../../../api/ai');
// 照片只压缩上传一次：1280px/quality 60，压缩图直接入 beans/ 入库 + 识别（不保留原图，节省空间）
const COMPRESS_WIDTH = 1280;
const COMPRESS_QUALITY = 60;
function compressAll(paths) {
  if (!paths || !paths.length) return Promise.resolve([]);
  return Promise.all(paths.map((p) => new Promise((resolve) => {
    if (typeof p === 'string' && p.startsWith('cloud://')) return resolve(p); // fileID 透传
    wx.compressImage({
      src: p, quality: COMPRESS_QUALITY, compressedWidth: COMPRESS_WIDTH,
      success: (r) => resolve(r.tempFilePath || p),
      fail: () => resolve(p), // 压缩失败回退原图
    });
  })));
}
Page({
  data: { tip: PHASES.compressing, statusBarPx: 44, navH: 44, error: '', retrying: false, phase: 'compressing', elapsed: 0 },
  onLoad() {
    this.setData(navMetrics());
    this.startTimer();
    this.run();
  },
  // 真实进度：总计时（秒）贯穿压缩→上传→识别→整理，让用户知道等待时间而非无感卡住
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => { this.setData({ elapsed: this.data.elapsed + 1 }); }, 1000);
  },
  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  setPhase(phase) { this.setData({ phase, tip: PHASES[phase] || '' }); },
  // 真实识别链路（只存压缩图，不保留原图）：
  //   本地照片 → 压缩(1280/q60) → 上传 beans/ → 多图合并识别；fileID 即入库照片
  //   重试时 fileID 已在云存储，直接复用，零重复上传
  run() {
    if (this.dead) return;
    const g = getApp().globalData;
    const photos = g.pendingPhotos || [];
    this.setData({ retrying: true, error: '', elapsed: 0 });
    this.startTimer();

    const allCloud = photos.length > 0 && photos.every((p) => typeof p === 'string' && p.startsWith('cloud://'));
    let uploaded;
    if (allCloud) {
      this.setPhase('recognizing'); // 重试：压缩图已在 beans/，跳过压缩上传
      uploaded = Promise.resolve(photos);
    } else {
      this.setPhase('compressing');
      uploaded = compressAll(photos)
        .then((c) => { this.setPhase('uploading'); return upload.uploadImages(c); })
        .then((ids) => { g.pendingPhotos = ids; return ids; }); // 压缩 fileID 即入库照片
    }

    uploaded
      .then((ids) => {
        this.setPhase('recognizing');
        return ids.length ? aiApi.recognizeBean(ids) : null; // 全部压缩图参与识别（正/背面信息互补）
      })
      .then((r) => {
        this.setPhase('finishing');
        g.aiResult = (r && r.form) || null;
        g.aiNewFlavors = (r && r.newFlavors) || []; // 库外新风味候选，confirm 页消费
        g.aiBrandCands = (r && r.brandCandidates) || []; // 品牌候选列表，confirm 页展示
        g.aiError = '';
        this.stopTimer();
        this.setData({ retrying: false, error: '' });
        this.go();
      })
      .catch((e) => {
        // 识别失败：透传错误原因（confirm 页兜底提示条），并原地展示供重试，避免静默空表单
        console.error('【识别链路失败】', e && (e.errMsg || e.message || e));
        const msg = (e && (e.errMsg || e.message)) || '识别失败，请检查云函数与网络';
        g.aiResult = null; g.aiNewFlavors = []; g.aiBrandCands = [];
        g.aiError = msg;
        this.stopTimer();
        this.setData({ retrying: false, error: msg });
      });
  },
  // 失败后原地重试
  retry() {
    if (this.data.retrying || this.data.error === '') return;
    this.setData({ error: '', elapsed: 0 });
    this.run();
  },
  // 失败后转手动填写（压缩图已上传 beans/，直接保留）
  goManual() {
    this.done = true;
    this.stopTimer();
    wx.redirectTo({ url: '/pages/add/confirm/confirm?mode=manual' });
  },
  onUnload() { this.stopTimer(); this.dead = true; },
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

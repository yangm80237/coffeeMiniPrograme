const TIPS = ['正在识别品牌…', '正在提取豆名与豆种…', '正在识别产区与处理法…', '正在匹配风味标签…', '整理识别结果，即将完成…'];
Page({
  data: { tip: TIPS[0] },
  onLoad() {
    this.i = 0;
    this.timer = setInterval(() => { this.i = (this.i + 1) % TIPS.length; this.setData({ tip: TIPS[this.i] }); }, 2000);
    this.done = setTimeout(() => this.go(), 4000); // mock 4s 完成；阶段④换云函数回调
  },
  onUnload() { clearInterval(this.timer); clearTimeout(this.done); },
  skip() { clearTimeout(this.done); this.go(); },
  go() { wx.redirectTo({ url: '/pages/add/confirm/confirm?mode=ai' }); },
});

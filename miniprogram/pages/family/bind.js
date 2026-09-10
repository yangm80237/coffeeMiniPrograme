// 家庭绑定页——bootstrap 分流：已有家庭直接进货架 / 创建或输码加入
const userApi = require('../../api/user');

Page({
  data: { mode: 'loading', code: '', saving: false },
  onLoad() {
    userApi.bootstrap().then(({ user, family }) => {
      if (user && family) return this.enter();
      this.setData({ mode: 'choose' });
    });
  },
  createFamily() {
    if (this.data.saving) return; // 防重复提交
    this.setData({ saving: true });
    userApi.createFamily().then(() => this.enter()).catch(() => this.setData({ saving: false }));
  },
  onCode(e) { this.setData({ code: e.detail.value.toUpperCase() }); },
  join() {
    if (this.data.saving) return; // 防重复提交
    this.setData({ saving: true });
    userApi.joinFamily(this.data.code).then(() => this.enter())
      .catch((e) => {
        this.setData({ saving: false });
        wx.showToast({ title: e.message === 'BAD_CODE' ? '邀请码不正确' : '家庭已满员', icon: 'none' });
      });
  },
  enter() { wx.reLaunch({ url: '/pages/shelf/shelf' }); },
});

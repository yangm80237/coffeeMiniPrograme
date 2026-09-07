// 家庭绑定页——bootstrap 分流：已有家庭直接进货架 / 创建或输码加入
const userApi = require('../../api/user');

Page({
  data: { mode: 'loading', code: '' },
  onLoad() {
    userApi.bootstrap().then(({ user, family }) => {
      if (user && family) return this.enter();
      this.setData({ mode: 'choose' });
    });
  },
  createFamily() { userApi.createFamily().then(() => this.enter()); },
  onCode(e) { this.setData({ code: e.detail.value.toUpperCase() }); },
  join() {
    userApi.joinFamily(this.data.code).then(() => this.enter())
      .catch((e) => wx.showToast({ title: e.message === 'BAD_CODE' ? '邀请码不正确' : '家庭已满员', icon: 'none' }));
  },
  enter() { wx.reLaunch({ url: '/pages/shelf/shelf' }); },
});

// 我的页——头像昵称填写区 + 家庭卡（邀请码管理）+ 入口列表（管理页仅 owner）
const userApi = require('../../api/user');

Page({
  data: { loaded: false, user: null, family: null, nickname: '', avatarUrl: '' },
  onShow() { this.refresh(); },
  refresh() {
    return userApi.bootstrap().then(({ user, family }) => {
      this.setData({
        loaded: true, user, family,
        nickname: user ? (user.nickname || '') : '',
        avatarUrl: user ? (user.avatarUrl || '') : '',
      });
    });
  },
  // 头像昵称填写区：chooseavatar 事件取 avatarUrl；nickname 输入 blur/change 取值
  onChooseAvatar(e) { this.setData({ avatarUrl: e.detail.avatarUrl }); },
  onNickname(e) { this.setData({ nickname: e.detail.value }); },
  saveProfile() {
    const { nickname, avatarUrl } = this.data;
    userApi.updateProfile({ nickname: (nickname || '').trim(), avatarUrl }).then((u) => {
      this.setData({ user: u });
      wx.showToast({ title: '已保存' });
    });
  },
  // 家庭卡：邀请码大字 + 复制 / 启用开关 / 重新生成
  copyCode() {
    wx.setClipboardData({ data: this.data.family.inviteCode });
  },
  toggleInvite(e) {
    userApi.setInviteEnabled(e.detail.value).then((family) => this.setData({ family }));
  },
  regenCode() {
    userApi.regenerateInvite().then((family) => {
      this.setData({ family });
      wx.showToast({ title: '已重新生成' });
    });
  },
  // 入口列表
  goStats() { wx.navigateTo({ url: '/pages/stats/stats' }); },
  goBrand() { wx.navigateTo({ url: '/pages/brand/list' }); },
  goFlavor() { wx.navigateTo({ url: '/pages/flavor/list' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }); },
});

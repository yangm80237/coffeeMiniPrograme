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
  // 头像昵称填写区：chooseavatar 事件取临时路径 → 云存储持久化（fileID），避免临时路径过期/模拟器 CORS
  onChooseAvatar(e) {
    const temp = e.detail.avatarUrl;
    const env = require('../../config/env');
    const setAndSave = (url) => {
      this.setData({ avatarUrl: url });
      this.saveProfile(url);
    };
    if (env.USE_CLOUD && wx.cloud && temp) {
      const ext = temp.indexOf('.png') > -1 ? '.png' : '.jpg';
      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
      wx.cloud.uploadFile({ cloudPath, filePath: temp })
        .then((r) => setAndSave(r.fileID))
        .catch(() => setAndSave(temp)); // 上传失败降级临时路径，仍可展示本次会话
    } else {
      setAndSave(temp);
    }
  },
  onNickname(e) { this.setData({ nickname: e.detail.value }); },
  saveProfile(avatarUrl) {
    if (this.data.saving) return; // 防重复提交（头像选择后立即保存，防连点）
    const { nickname } = this.data;
    this.setData({ saving: true });
    userApi.updateProfile({
      nickname: (nickname || '').trim(),
      avatarUrl: avatarUrl || this.data.avatarUrl || '',
    }).then((u) => {
      this.setData({ user: u, saving: false });
      wx.showToast({ title: '已保存' });
    }).catch(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
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

// 新增/编辑品牌——Logo 上传 + 国家快捷 chips（原型 screen-brand-add 1298–1328 搬运）
// 编辑模式：onLoad 带 id → 预填并走 updateBrand；否则新增
const brandApi = require('../../api/brand');
const { COUNTRIES, getFlag } = require('../../api/flags');

// 国旗 emoji（Regional Indicator 双码）前缀剥离：chips 以「🇨🇳 中国」形式填入
function stripFlag(s) {
  return (s || '').replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/g, '').trim();
}

// 别名文本（中英文逗号/顿号分隔）→ 数组
function parseAliases(s) {
  return String(s || '').split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
}

Page({
  data: { id: '', editing: false, isBuiltin: false, logo: '', name: '', nameEn: '', aliasesText: '', country: '', description: '' },
  onLoad(options) {
    // 国旗快捷 chips：COUNTRIES 前 8 个，js 预组装 [{v, flag, name}]（wxml 不能调函数）
    const chips = COUNTRIES.slice(0, 8).map((c) => ({ v: getFlag(c) + ' ' + c, flag: getFlag(c), name: c }));
    this.setData({ chips });
    if (options.id) {
      this.id = options.id;
      this.setData({ id: options.id, editing: true });
      wx.setNavigationBarTitle({ title: '编辑品牌' });
      brandApi.getBrand(options.id).then(({ brand }) => {
        this.setData({
          logo: brand.logo || '', name: brand.name || '', nameEn: brand.nameEn || '',
          aliasesText: (brand.aliases || []).join('，'),
          country: brand.country || '', description: brand.description || '',
        });
      });
    }
  },
  chooseLogo() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: (res) => this.setData({ logo: res.tempFiles[0].tempFilePath }),
    });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onNameEn(e) { this.setData({ nameEn: e.detail.value }); },
  onAliases(e) { this.setData({ aliasesText: e.detail.value }); },
  onCountry(e) { this.setData({ country: e.detail.value }); },
  pickChip(e) { this.setData({ country: e.currentTarget.dataset.v }); },
  onDesc(e) { this.setData({ description: e.detail.value }); },
  save() {
    if (this.data.saving) return; // 防重复提交
    const name = (this.data.name || '').trim();
    if (!name) return wx.showToast({ title: '请填写品牌名称', icon: 'none' });
    const payload = {
      name,
      nameEn: (this.data.nameEn || '').trim(),
      aliases: parseAliases(this.data.aliasesText),
      logo: this.data.logo,
      country: stripFlag(this.data.country),
      description: (this.data.description || '').trim(),
    };
    this.setData({ saving: true });
    const done = () => {
      this.setData({ saving: false });
      wx.showToast({ title: '已保存' });
      setTimeout(() => wx.navigateBack(), 600);
    };
    if (this.data.editing) {
      brandApi.updateBrand(this.data.id, payload).then(done)
        .catch(() => { this.setData({ saving: false }); wx.showToast({ title: '保存失败', icon: 'none' }); });
    } else {
      brandApi.createBrand(payload).then(done)
        .catch(() => { this.setData({ saving: false }); wx.showToast({ title: '保存失败', icon: 'none' }); });
    }
  },
});

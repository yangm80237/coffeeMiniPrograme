const beanApi = require('../../../api/bean');
const flavorApi = require('../../../api/flavor');
const { getFlag, COUNTRIES } = require('../../../api/flags');
const EMPTY = { name:'', brandId:'', brandName:'', country:'', origin:'', variety:'', process:'',
  altitude:'', weight:'', roastLevel:'中', brewMethod:'手冲', roastDate:'', flavorTagIds:[], flavorDesc:'' };
const ROAST = ['浅','中浅','中','中深','深']; const BREW = ['手冲','意式','通用'];

Page({
  data: { isEdit: false, mode: 'ai', photos: [], coverIndex: 0, form: { ...EMPTY },
    roastLevels: ROAST, brewMethods: BREW, countryChips: [], varietyChips: ['瑰夏','74158','铁皮卡','波旁','SL28','卡杜拉'],
    processChips: ['水洗','日晒','蜜处理','厌氧日晒','湿剥法'],
    flavorGroups: [], pickedFlavors: [], pickedIds: {}, dialogOpen: false, flavorPickerOpen: false },
  onLoad(options) {
    // 偏差（微）：COUNTRIES.slice(0,6) 映射为 {v, flag} 对象，供 WXML 直接渲染国旗 emoji
    this.setData({ countryChips: COUNTRIES.slice(0, 6).map((c) => ({ v: c, flag: getFlag(c) })) });
    flavorApi.listFlavors().then((flavorGroups) => this.setData({ flavorGroups }));
    if (options.mode === 'edit') {
      this.editId = options.id; this.setData({ isEdit: true, mode: 'edit' });
      beanApi.getBean(options.id).then((b) => {
        const form = this.toForm(b);
        this.snapshot = JSON.stringify(form);
        this.setData({ form, photos: b.photos, coverIndex: 0,
          pickedFlavors: b.flavors, pickedIds: Object.fromEntries(b.flavors.map((f) => [f._id, true])) });
      });
    } else {
      const g = getApp().globalData;
      if (options.mode === 'manual') { g.pendingPhotos = null; this.setData({ photos: [] }); }
      this.snapshot = JSON.stringify({ ...EMPTY });
      this.setData({ mode: options.mode || 'ai', photos: g.pendingPhotos || [], coverIndex: g.mainIndex || 0 });
    }
  },
  toForm(b) { return { name:b.name, brandId:b.brandId, brandName:b.brand, country:b.country, origin:b.origin,
    variety:b.variety, process:b.process, altitude:b.altitude, weight:b.weight, roastLevel:b.roastLevel,
    brewMethod:b.brewMethod, roastDate:b.roastDate, flavorTagIds:b.flavorTagIds, flavorDesc:b.flavorDesc }; },
  // 输入类事件统一：data-f + bindinput/onSegment(data-v)
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.detail.value }); },
  onSegment(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.currentTarget.dataset.v }); },
  onRoastDate(e) { this.setData({ 'form.roastDate': e.detail.value }); },
  pickChip(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.currentTarget.dataset.v }); },
  pickFlag(e) { this.setData({ 'form.country': e.currentTarget.dataset.v }); },
  toggleFlavor(e) { const id = e.currentTarget.dataset.id; const p = { ...this.data.pickedIds };
    if (p[id]) delete p[id]; else p[id] = true;
    const pickedFlavors = this.data.flavorGroups.flatMap((g) => g.items).filter((f) => p[f._id]);
    this.setData({ pickedIds: p, pickedFlavors, 'form.flavorTagIds': pickedFlavors.map((f) => f._id) }); },
  openFlavorPicker() { this.setData({ flavorPickerOpen: true }); },
  closeFlavorPicker() { this.setData({ flavorPickerOpen: false }); },
  pickCover(e) { this.setData({ coverIndex: e.detail.index }); },
  noop() {},

  payload() { const f = this.data.form;
    return { ...f, weight: Number(f.weight) || 0,
      photos: this.data.isEdit ? undefined : this.data.photos,
      coverIndex: this.data.isEdit ? undefined : this.data.coverIndex }; },
  onSubmit() {
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: '请填写豆名', icon: 'none' });
    if (!f.roastDate) return wx.showToast({ title: '请选择烘焙日期', icon: 'none' });
    const p = this.data.isEdit
      ? beanApi.updateBean(this.editId, this.payload())
      : upload.uploadImages(this.data.photos).then((fileIDs) => beanApi.createBean({ ...this.payload(), photos: fileIDs }));
    p.then(() => { getApp().globalData.pendingPhotos = null;
      if (this.data.isEdit) wx.navigateBack(); else wx.reLaunch({ url: '/pages/shelf/shelf' }); });
  },
  onBack() { // 编辑形态返回三选逻辑
    if (!this.data.isEdit) return wx.navigateBack();
    const changed = JSON.stringify(this.data.form) !== this.snapshot;
    if (!changed) return wx.navigateBack();
    this.setData({ dialogOpen: true });
  },
  dialogSave() { this.setData({ dialogOpen: false }); this.onSubmit(); },
  dialogDiscard() { this.setData({ dialogOpen: false, form: JSON.parse(this.snapshot) }); wx.navigateBack(); },
  dialogCancel() { this.setData({ dialogOpen: false }); },
});

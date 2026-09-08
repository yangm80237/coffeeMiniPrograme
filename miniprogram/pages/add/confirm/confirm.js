const beanApi = require('../../../api/bean');
const brandApi = require('../../../api/brand');
const flavorApi = require('../../../api/flavor');
const adminApi = require('../../../api/admin');
const { call, enabled: cloudEnabled } = require('../../../api/cloud');
const { COUNTRIES } = require('../../../api/flags');
const upload = require('../../../api/upload');
const { firstChar } = require('../../../utils/format');
const { navMetrics } = require('../../../utils/nav');
const EMPTY = { name:'', brandId:'', brandName:'', country:'', origin:'', variety:'', process:'',
  altitude:'', weight:'', roastLevel:'中', brewMethod:'手冲', roastDate:'', flavorTagIds:[], flavorDesc:'' };
const ROAST = ['浅','中浅','中','中深','深']; const BREW = ['手冲','意式','通用'];

// 品牌清单本地缓存：v1 为版本号（结构/口径变更时升级强制失效），TTL 24h
const BRAND_CACHE_KEY = 'brand_cache_v1';
const BRAND_CACHE_TTL = 24 * 3600 * 1000;

// 品牌 logo 首字色块渐变池（与品牌库列表同色系）
const GRADS = [
  'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f6d365,#fda085)',
  'linear-gradient(135deg,#11998e,#38ef7d)', 'linear-gradient(135deg,#0f2027,#2c5364)',
  'linear-gradient(135deg,#e8a87c,#c96f4a)', 'linear-gradient(135deg,#a8c0ff,#3f2b96)',
];
const gradOf = (name) => {
  let h = 0;
  for (const ch of String(name || '')) h += ch.codePointAt(0);
  return GRADS[h % GRADS.length];
};

// 风味描述词 → 标签（中英文，与 V2 原型一致；阶段③④将由云函数调用方舟替换）
const FLAVOR_MAP = {
  'white honey': ['白蜜','🍯'], 'black tea': ['红茶','🍵'], 'blood orange': ['血橙','🍊'],
  'strawberry': ['草莓','🍓'], 'cream': ['奶油','🍦'], 'orange': ['橙子','🍊'],
  'jasmine': ['茉莉','🌼'], 'bergamot': ['佛手柑','🍋'], 'honey': ['蜂蜜','🍯'],
  'caramel': ['焦糖','🍬'], 'chocolate': ['巧克力','🍫'], 'vanilla': ['香草','🍦'],
  'citrus': ['柑橘','🍋'], 'peach': ['桃子','🍑'], 'berry': ['莓果','🫐'], 'floral': ['花香','🌼'],
  '茉莉': ['茉莉','🌼'], '蜂蜜': ['蜂蜜','🍯'], '红茶': ['红茶','🍵'], '白蜜': ['白蜜','🍯'],
  '草莓': ['草莓','🍓'], '奶油': ['奶油','🍦'], '橙子': ['橙子','🍊'], '焦糖': ['焦糖','🍬'],
  '巧克力': ['巧克力','🍫'], '香草': ['香草','🍦'], '柑橘': ['柑橘','🍋'], '桃子': ['桃子','🍑'],
  '莓果': ['莓果','🫐'], '花香': ['花香','🌼'], '佛手柑': ['佛手柑','🍋'],
};

Page({
  data: {
    isEdit: false, mode: 'ai', navTitle: '确认豆子信息',
    statusBarPx: 44, navH: 44,
    photos: [], coverIndex: 0, form: { ...EMPTY },
    roastLevels: ROAST, brewMethods: BREW,
    varietyChips: [], processChips: ['水洗','日晒','蜜处理','厌氧','湿剥法'],
    varietySel: {},
    countryPopOpen: false, countryOptions: [],
    flavorGroups: [], pickedFlavors: [], pickedIds: {},
    dialogOpen: false, flavorPickerOpen: false,
    brandPickerOpen: false, brandOptions: [], brandKw: '', brandDesc: '', brandInfo: null,
    submitting: false,
    aiExtracting: false,
  },

  onLoad(options) {
    // 自定义导航度量：状态栏 + 胶囊对齐（替代 env(safe-area-inset-top)，模拟器部分机型为 0）
    this.setData(navMetrics());
    // 库存聚合：豆种/处理法 Top4（与统计页同源）
    const varietyChips = this.topField('variety', 4);
    const processChips = this.topField('process', 4);
    this.setData({ varietyChips, processChips });

    flavorApi.listFlavors().then((flavorGroups) => this.applyFlavorGroups(flavorGroups));
    if (options.mode === 'edit') {
      this.editId = options.id;
      this.setData({ isEdit: true, mode: 'edit', navTitle: '编辑豆子' });
      beanApi.getBean(options.id).then((b) => {
        const form = this.toForm(b);
        this.snapshot = JSON.stringify(form);
        this._initialPhotos = b.photos || []; // 旧图保留基线，保存时只上传新增
        this.setData({ form, photos: b.photos || [], coverIndex: 0,
          pickedFlavors: b.flavors, pickedIds: Object.fromEntries(b.flavors.map((f) => [f._id, true])) });
        this.syncVarietySelFromForm();
        this.reflectBrand(b.brandId);
      });
    } else {
      const g = getApp().globalData;
      const mode = options.mode || 'ai';
      const navTitle = mode === 'manual' ? '手动录入豆子' : '确认豆子信息';
      this._initialPhotos = [];
      if (mode === 'manual') { g.pendingPhotos = null; this.setData({ photos: [] }); }
      this.snapshot = JSON.stringify({ ...EMPTY });
      this.setData({ mode, navTitle, photos: g.pendingPhotos || [], coverIndex: g.mainIndex || 0 });
      // ai 模式：消费 processing 写入 globalData.aiResult 的识别结果（form 字段对象），合并预填
      if (mode === 'ai') {
        const ai = g.aiResult;
        const aiNewFlavors = g.aiNewFlavors || []; // 库外新风味候选（识别云函数返回），消费即清
        g.aiNewFlavors = [];
        if (ai) {
          const merged = { ...this.data.form };
          Object.keys(ai).forEach((k) => { if (ai[k] !== '' && ai[k] !== null && ai[k] !== undefined) merged[k] = ai[k]; });
          this.setData({ form: merged });
          this.pendingAiTagIds = merged.flavorTagIds || []; // flavorGroups 异步加载完成后由 applyFlavorGroups 落到 pickedFlavors
          g.aiResult = null; // 消费即置空，避免返回重复预填
        }
        // 库外新风味候选区：默认全选，入库时创建为「其他」分类标签
        this.setData({ newFlavorCands: aiNewFlavors.map((n) => ({ name: n, checked: true })) });
      }
      this.syncVarietySelFromForm();
    }
  },

  // 风味库异步加载完成：按 form.flavorTagIds 重算已选集合（来源不管 ai/edit/手动，以 tagIds 为准）
  applyFlavorGroups(flavorGroups) {
    const groups = flavorGroups || [];
    // AI 预填暂存：flavorGroups 异步到位后落到 form 与 picked（ai 模式，pendingAiTagIds 由 onLoad 写入）
    if (this.pendingAiTagIds) {
      this.setData({ 'form.flavorTagIds': this.pendingAiTagIds });
      this.pendingAiTagIds = null; // 落定即清理，避免返回重复预填
    }
    const pickedFlavors = groups.flatMap((g) => g.items).filter((f) => this.data.form.flavorTagIds.includes(f._id));
    const pickedIds = Object.fromEntries(pickedFlavors.map((f) => [f._id, true]));
    this.setData({ flavorGroups: groups, pickedFlavors, pickedIds });
  },

  // 从 beans 聚合某字段 Top n（mock 数据阶段走内存；云开发阶段替换为聚合接口）
  topField(field, n) {
    const BEANS = require('../../../mock/beans');
    const m = {};
    for (const b of BEANS) {
      // variety 可能是 "A · B" 多值，拆分计数；String() 兜底非字符串（数组/数字）
      if (field === 'variety' && b[field]) {
        String(b[field]).split(/[·,，、;；\s]+/).forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; });
      } else if (b[field]) {
        m[b[field]] = (m[b[field]] || 0) + 1;
      }
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  },

  toForm(b) { return { name:b.name, brandId:b.brandId, brandName:b.brand, country:b.country, origin:b.origin,
    variety:b.variety, process:b.process, altitude:b.altitude, weight:b.weight, roastLevel:b.roastLevel,
    brewMethod:b.brewMethod, roastDate:b.roastDate, flavorTagIds:b.flavorTagIds, flavorDesc:b.flavorDesc }; },

  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.detail.value }); },
  onSegment(e) { this.setData({ ['form.' + e.currentTarget.dataset.f]: e.currentTarget.dataset.v }); },
  onRoastDate(e) { this.setData({ 'form.roastDate': e.detail.value }); },

  // ===== 国家联想 =====
  onCountryInput(e) { this.setData({ 'form.country': e.detail.value }); this.renderCountryOptions(e.detail.value); },
  onCountryFocus() { this.renderCountryOptions(this.data.form.country); this.setData({ countryPopOpen: true }); },
  onCountryBlur() { setTimeout(() => this.setData({ countryPopOpen: false }), 150); },
  renderCountryOptions(kw) {
    const q = (kw || '').trim();
    let hits = COUNTRIES.filter((c) => !q || c.includes(q));
    if (q && !COUNTRIES.includes(q)) {
      hits = [{ n: q, isManual: true }, ...hits.map((n) => ({ n }))];
    } else {
      hits = hits.map((n) => ({ n }));
    }
    this.setData({ countryOptions: hits });
  },
  pickCountry(e) {
    const n = e.currentTarget.dataset.n;
    this.setData({ 'form.country': n, countryPopOpen: false });
  },

  // ===== 豆种多选 =====
  onVarietyInput(e) {
    this.setData({ 'form.variety': e.detail.value });
    this.syncVarietySelFromForm();
  },
  // 失焦格式化：空格/半角逗号/全角逗号/顿号/分号/中点 → 「A · B」并去重
  onVarietyBlur() {
    const raw = String(this.data.form.variety || '');
    const parts = raw.split(/[·,，、;；\s]+/).map((s) => s.trim()).filter(Boolean);
    const uniq = Array.from(new Set(parts));
    const joined = uniq.join(' · ');
    if (joined !== raw) {
      this.setData({ 'form.variety': joined });
    }
    this.syncVarietySelFromForm();
  },
  syncVarietySelFromForm() {
    const val = String(this.data.form.variety || '');
    const sel = {};
    val.split(/[·,，、;；\s]+/).filter(Boolean).forEach((v) => { sel[v] = true; });
    this.setData({ varietySel: sel });
  },
  toggleVarietyChip(e) {
    const v = e.currentTarget.dataset.v;
    const sel = { ...this.data.varietySel };
    if (sel[v]) delete sel[v]; else sel[v] = true;
    const joined = Object.keys(sel).join(' · ');
    this.setData({ varietySel: sel, 'form.variety': joined });
  },

  // ===== 处理法单选 =====
  pickProcessChip(e) {
    this.setData({ 'form.process': e.currentTarget.dataset.v });
  },

  toggleFlavor(e) { const id = e.currentTarget.dataset.id; const p = { ...this.data.pickedIds };
    if (p[id]) delete p[id]; else p[id] = true;
    const pickedFlavors = this.data.flavorGroups.flatMap((g) => g.items).filter((f) => p[f._id]);
    this.setData({ pickedIds: p, pickedFlavors, 'form.flavorTagIds': pickedFlavors.map((f) => f._id) }); },

  // ===== 库外新风味候选（AI 识别，勾选后入库时创建为「其他」分类标签）=====
  toggleNewFlavor(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ [`newFlavorCands[${i}].checked`]: !this.data.newFlavorCands[i].checked });
  },
  // 逐个创建勾选的新风味（返回 [{name, _id}]；单个失败跳过不阻塞入库）
  createCheckedNewFlavors() {
    const cands = this.data.newFlavorCands.filter((c) => c.checked);
    const created = [];
    return cands.reduce((chain, c) => chain.then(() =>
      flavorApi.createFlavor({ name: c.name, category: '其他' })
        .then((f) => created.push({ name: c.name, _id: f._id }))
        .catch(() => {})
    ), Promise.resolve()).then(() => created);
  },
  // 新风味自动生图（config.autoIcon 开关控制，缺省开）：fire-and-forget，不阻塞跳转
  triggerIconGen(created) {
    if (!created.length) return;
    adminApi.getModelConfig().then((c) => {
      if (!c || c.autoIcon === false || !cloudEnabled()) return;
      call('genFlavorIcon', { names: created.map((x) => x.name) }).catch(() => {});
    }).catch(() => {});
  },
  openFlavorPicker() { this.setData({ flavorPickerOpen: true }); },
  closeFlavorPicker() { this.setData({ flavorPickerOpen: false }); },
  pickCover(e) { this.setData({ coverIndex: e.detail.index }); },
  // photo-strip「＋」：补拍/加图
  addPhoto() {
    wx.chooseMedia({
      count: 9, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (r) => {
        const next = this.data.photos.concat(r.tempFiles.map((f) => f.tempFilePath));
        this.setData({ photos: next });
      },
    });
  },
  // ===== 品牌选择浮层 =====
  openBrandPicker() {
    this.setData({ brandPickerOpen: true });
    // 缓存优先：本地缓存即时反显（<300ms），过期或缺失时后台请求刷新（stale-while-revalidate）
    try {
      const c = wx.getStorageSync(BRAND_CACHE_KEY);
      if (c && c.list && c.list.length) {
        this._allBrands = c.list.map((b) => ({ ...b, first: firstChar(b.name), grad: gradOf(b.name) }));
        this.filterBrands();
        if (Date.now() - c.ts > BRAND_CACHE_TTL) this.fetchBrands();
      } else {
        this.fetchBrands();
      }
    } catch (e) { this.fetchBrands(); }
  },
  fetchBrands() {
    brandApi.listBrands({}).then((list) => {
      this._allBrands = list.map((b) => ({ ...b, first: firstChar(b.name), grad: gradOf(b.name) }));
      this.filterBrands(); // 刷新浮层列表（服务端更新即实时同步）
      try { wx.setStorageSync(BRAND_CACHE_KEY, { ts: Date.now(), list }); } catch (e) { /* 存储失败忽略 */ }
    });
  },
  // 编辑态：按 brandId 从缓存/接口反显品牌完整信息（logo、首字色块、国家）
  reflectBrand(brandId) {
    if (!brandId) return;
    const apply = (list) => {
      const b = (list || []).find((x) => x._id === brandId);
      if (!b) return;
      this.setData({ brandInfo: { logo: b.logo || '', first: firstChar(b.name), grad: gradOf(b.name) },
        brandDesc: (b.flag || '') + ' ' + (b.country || '') + ' · 当前品牌' });
    };
    try {
      const c = wx.getStorageSync(BRAND_CACHE_KEY);
      if (c && c.list && c.list.length) { apply(c.list); return; }
    } catch (e) { /* 读缓存失败走接口 */ }
    brandApi.listBrands({}).then(apply);
  },
  closeBrandPicker() { this.setData({ brandPickerOpen: false }); },
  filterBrands() {
    const kw = (this.data.brandKw || '').trim().toLowerCase();
    let list = this._allBrands || [];
    if (kw) list = list.filter((b) => ((b.name || '') + (b.nameEn || '')).toLowerCase().includes(kw));
    this.setData({ brandOptions: list });
  },
  onBrandKw(e) { this.setData({ brandKw: e.detail.value }, () => this.filterBrands()); },
  pickBrand(e) {
    const { id, name } = e.currentTarget.dataset;
    const b = (this._allBrands || []).find((x) => x._id === id) || {};
    // 即时反显品牌完整信息（setData 同步渲染，<300ms）
    this.setData({ 'form.brandId': id, 'form.brandName': name,
      brandInfo: { logo: b.logo || '', first: firstChar(b.name), grad: b.grad || gradOf(b.name) },
      brandDesc: (b.flag || '') + ' ' + (b.country || '') + ' · 已从品牌库选择',
      brandPickerOpen: false });
  },
  noop() {},

  // ===== AI 提取风味标签（中英文描述）=====
  aiExtractFlavors() {
    if (this.data.aiExtracting) return;
    this.setData({ aiExtracting: true });
    setTimeout(() => {
      const desc = this.data.form.flavorDesc || '';
      const found = this.parseFlavors(desc);
      if (found.length) {
        // 从已加载的风味库中按中文名匹配（阶段③④由云函数返回标签 id）
        const allFlavors = this.data.flavorGroups.flatMap((g) => g.items);
        const pickedIds = {};
        const pickedFlavors = [];
        for (const [name] of found) {
          const f = allFlavors.find((x) => x.name === name);
          if (f && !pickedIds[f._id]) { pickedIds[f._id] = true; pickedFlavors.push(f); }
        }
        if (pickedFlavors.length) {
          this.setData({ pickedIds, pickedFlavors, 'form.flavorTagIds': pickedFlavors.map((f) => f._id) });
        }
        wx.showToast({ title: `已提取 ${pickedFlavors.length} 个标签`, icon: 'none' });
      } else {
        wx.showToast({ title: '未提取到已知风味词', icon: 'none' });
      }
      this.setData({ aiExtracting: false });
    }, 900);
  },
  parseFlavors(str) {
    let rest = (str || '').toLowerCase();
    const found = []; const seen = new Set();
    const push = (n, i) => { if (n && !seen.has(n)) { seen.add(n); found.push([n, i]); } };
    for (const [k, v] of Object.entries(FLAVOR_MAP)) {
      if (k.includes(' ') && rest.includes(k)) { push(v[0], v[1]); rest = rest.split(k).join(' '); }
    }
    rest.split(/[^a-z\u4e00-\u9fa5]+/).forEach((tok) => {
      if (tok && FLAVOR_MAP[tok]) push(FLAVOR_MAP[tok][0], FLAVOR_MAP[tok][1]);
    });
    return found;
  },

  payload() { const f = this.data.form;
    return { ...f, weight: Number(f.weight) || 0,
      photos: this.data.isEdit ? undefined : this.data.photos,
      coverIndex: this.data.isEdit ? undefined : this.data.coverIndex }; },
  onSubmit() {
    if (this.data.submitting) return; // 防重复提交：请求进行中直接忽略后续点击
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: '请填写豆名', icon: 'none' });
    if (!f.roastDate) return wx.showToast({ title: '请选择烘焙日期', icon: 'none' });
    this.setData({ submitting: true });
    wx.showLoading({ title: this.data.isEdit ? '保存中…' : '入库中…', mask: true });
    // 勾选的库外新风味先建档（「其他」分类），用返回 _id 补进 flavorTagIds 再入库
    const prep = this.createCheckedNewFlavors().then((created) => {
      if (created.length) {
        this.setData({ 'form.flavorTagIds':
          [...this.data.form.flavorTagIds, ...created.map((x) => x._id)] });
      }
      return created;
    });
    // 编辑态：旧图保留，只上传新增照片（避免 fileID 被当临时路径重复上传）
    const p = prep.then((created) => {
      const save = this.data.isEdit
        ? (() => {
            const init = this._initialPhotos || [];
            const kept = this.data.photos.filter((x) => init.includes(x));
            const added = this.data.photos.filter((x) => !init.includes(x));
            return upload.uploadImages(added).then((ids) =>
              beanApi.updateBean(this.editId, { ...this.payload(), photos: [...kept, ...ids] }));
          })()
        : upload.uploadImages(this.data.photos).then((fileIDs) => beanApi.createBean({ ...this.payload(), photos: fileIDs }));
      return save.then(() => created);
    });
    // 15s 超时兜底：超时后恢复按钮允许重试（阶段③接入云函数时需服务端按 beanName+roastDate 幂等去重）
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 15000));
    Promise.race([p, timeout]).then((created) => {
      wx.hideLoading();
      this.triggerIconGen(created || []); // 自动生图开关开启时异步生成新风味图标（fire-and-forget）
      getApp().globalData.pendingPhotos = null;
      if (this.data.isEdit) wx.navigateBack(); else wx.reLaunch({ url: '/pages/shelf/shelf' });
    }).catch((e) => {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: e && e.message === 'TIMEOUT' ? '请求超时，请重试' : '操作失败，请重试', icon: 'none' });
    });
  },
  onBack() { // 编辑形态返回三选逻辑
    if (!this.data.isEdit) return wx.navigateBack();
    const changed = JSON.stringify(this.data.form) !== this.snapshot;
    if (!changed) return wx.navigateBack();
    this.setData({ dialogOpen: true });
  },
  dialogSave() { this.setData({ dialogOpen: false }); this.onSubmit(); },
  dialogDiscard() { this.setData({ dialogOpen: false, form: JSON.parse(this.snapshot) }); this.syncVarietySelFromForm(); wx.navigateBack(); },
  dialogCancel() { this.setData({ dialogOpen: false }); },
});

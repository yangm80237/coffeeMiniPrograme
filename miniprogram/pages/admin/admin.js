// 管理页——模型 ID 维护（视觉/生图），仅 owner 可写（规格书 3.9）
const adminApi = require('../../api/admin');

Page({
  data: {
    modelVision: '', modelImage: '', autoIcon: true, source: '', sourceLabel: '',
    modelHint: '', // 模型 ID 与当前服务商不匹配提示
    // 识别服务商：volc=火山方舟 / deepseek=DeepSeek（视觉模型 deepseek-v4-flash-vision-exp）
    providerNames: [
      { value: 'volc', label: '火山方舟', ph: '如：doubao-seed-2-0-lite-260428' },
      { value: 'deepseek', label: 'DeepSeek', ph: '如：deepseek-v4-flash-vision-exp' },
    ],
    providerIndex: 0, visionProvider: 'volc',
    reinitLines: '', reinitRunning: false,
    reinitProcessed: 0, reinitRemaining: 0, reinitNext: '',
  },
  onShow() { this.refresh(); },
  refresh() {
    return adminApi.getModelConfig().then((c) => {
      // source==='env' 为环境变量回退，其余（config/admin 写入）视为 config 集合
      this.setData({
        modelVision: c.modelVision || '', modelImage: c.modelImage || '',
        autoIcon: c.autoIcon !== false, // 缺省 true
        visionProvider: c.visionProvider === 'deepseek' ? 'deepseek' : 'volc',
        providerIndex: c.visionProvider === 'deepseek' ? 1 : 0,
        modelHint: this.computeModelHint(c.modelVision, c.visionProvider === 'deepseek' ? 'deepseek' : 'volc'),
        source: c.source, sourceLabel: c.source === 'env' ? '环境变量回退' : 'config 集合',
      });
    });
  },
  onProvider(e) {
    const i = Number(e.detail.value) || 0;
    const patch = { providerIndex: i, visionProvider: this.data.providerNames[i].value };
    patch.modelHint = this.computeModelHint(this.data.modelVision, patch.visionProvider);
    this.setData(patch);
  },
  // 模型 ID 与当前服务商不匹配时提示（不自动清空，保留用户填写的值）
  computeModelHint(model, provider) {
    const m = String(model || '').trim();
    if (!m) return '';
    const isVolcModel = /^(doubao-|ep-)/.test(m);
    const isDsModel = m.startsWith('deepseek-');
    if ((provider === 'deepseek' && isVolcModel) || (provider === 'volc' && isDsModel)) {
      return '该模型 ID 属于另一服务商，识别将回退使用当前服务商的默认模型';
    }
    return '';
  },
  onVision(e) {
    this.setData({
      modelVision: e.detail.value,
      modelHint: this.computeModelHint(e.detail.value, this.data.visionProvider),
    });
  },
  onImage(e) { this.setData({ modelImage: e.detail.value }); },
  // 新风味自动生图开关：即时落库，失败回滚
  onAutoIcon(e) {
    const v = e.detail.value;
    const prev = this.data.autoIcon;
    this.setData({ autoIcon: v });
    adminApi.updateModelConfig({ autoIcon: v }).catch(() => {
      this.setData({ autoIcon: prev });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },
  save() {
    if (this.data.saving) return; // 防重复提交（两张卡共用）
    this.setData({ saving: true });
    adminApi.updateModelConfig({
      modelVision: (this.data.modelVision || '').trim(),
      modelImage: (this.data.modelImage || '').trim(),
      visionProvider: this.data.visionProvider === 'deepseek' ? 'deepseek' : 'volc',
    }).then((c) => {
      this.setData({ saving: false, source: c.source, sourceLabel: c.source === 'env' ? '环境变量回退' : 'config 集合' });
      wx.showToast({ title: '已保存' });
    }).catch((e) => {
      this.setData({ saving: false });
      wx.showToast({
        title: e.message === 'FORBIDDEN' ? '仅家庭创建者可修改' : '保存失败', icon: 'none',
      });
    });
  },
  testConn() { wx.showToast({ title: '阶段④开放', icon: 'none' }); },
  // 品牌重初始化——textarea 输入捕获
  onReinitLines(e) { this.setData({ reinitLines: e.detail.value }); },
  // 解析清单：按行拆，每行按中英文逗号拆 [名字,国家]，过滤空行/格式错行
  _parseReinitLines() {
    const raw = (this.data.reinitLines || '').split(/\r?\n/);
    const lines = [];
    let bad = 0;
    for (const line of raw) {
      const s = line.trim();
      if (!s) continue;
      const parts = s.split(/[，,]/).map((x) => x.trim());
      if (!parts[0]) { bad++; continue; }
      lines.push(s); // 保留原行字符串，云函数自行按逗号拆分
    }
    return { lines, bad };
  },
  // 开始重建：空清单拦截 → 红色二次确认 → 调云函数 → 进度回填
  startReinit() {
    const { lines, bad } = this._parseReinitLines();
    if (bad > 0) wx.showToast({ title: `跳过 ${bad} 行格式错误`, icon: 'none' });
    if (!lines.length) {
      wx.showToast({ title: '清单为空', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '品牌库重初始化',
      content: '将清空现有全部品牌（含自建）并按清单重建，已入库豆子的品牌关联会变空。确定？',
      confirmColor: '#E5484D',
      success: (res) => {
        if (!res.confirm) return;
        this._reinitLines = lines; // 保存解析后的清单供断点续跑
        this._runReinit(lines);
      },
    });
  },
  // 断点续跑：用上次保存的 lines 再调一次（云函数靠实例保温 processedNames 去重）
  continueReinit() {
    const lines = this._reinitLines;
    if (!lines || !lines.length) {
      wx.showToast({ title: '清单已失效，请重新填写', icon: 'none' });
      return;
    }
    this._runReinit(lines);
  },
  _runReinit(lines) {
    this.setData({ reinitRunning: true });
    adminApi.reinitBrands(lines).then((r) => {
      this.setData({
        reinitProcessed: r.processed || 0,
        reinitRemaining: r.remaining || 0,
        reinitNext: r.nextLine || '',
      });
      if (r.remaining === 0) {
        this.setData({ reinitRunning: false });
        wx.showToast({ title: '重建完成' });
      }
      // remaining>0：保持 running 等待「继续」
    }).catch((e) => {
      this.setData({ reinitRunning: false });
      wx.showToast({ title: e.message || '重建失败', icon: 'none' });
    });
  },
});

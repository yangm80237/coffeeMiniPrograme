# 阶段② 小程序前端全量开发 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 原生小程序前端全量落地——16 页全部可操作（mock 数据驱动），api 层签名与云开发一致，同时完成云环境与集合初始化准备，为阶段③"只换数据源"做好衔接。

**Architecture:** 原生小程序（WXML/WXSS/JS，CommonJS）。视觉与交互以 `docs/prototype.html` 为唯一像素基准（逐屏搬运）；功能规则以 `docs/需求规格书.md` v1.3 为准。数据一律走 `miniprogram/api/` 层（Promise 接口），内部由 `USE_CLOUD` 开关切换 mock/云实现，页面代码不感知数据源。纯逻辑（状态计算/格式化/统计聚合/api 契约）用 node:test 做 TDD；页面用微信开发者工具人工走查验证。

**Tech Stack:** 微信原生小程序 + 微信云开发（阶段②仅初始化配置）+ node:test（纯函数测试，零依赖）。

**Spec:**
- `docs/需求规格书.md`（v1.3：功能规则/字段表/页面清单）
- `docs/设计方案.md`（v1.1：工程结构/设计 token/决策记录）
- `docs/prototype.html`（视觉与交互基准）

**原型屏索引（阶段①已走查定稿，样式搬运行号）：**

| 屏 | 行号 | 页面 |
|---|---|---|
| screen-shelf | 629–757 | 货架页 |
| screen-add | 758–814 | 添加豆子页 |
| screen-camera | 815–834 | 拍照页 |
| screen-upload | 835–857 | 确认照片页 |
| screen-processing | 858–893 | AI识别中页 |
| screen-confirm | 894–1010 | 确认编辑页 |
| screen-detail | 1011–1102 | 豆子详情页 |
| screen-flavor | 1103–1165 | 风味维护页 |
| screen-brand | 1166–1297 | 品牌列表页 |
| screen-brand-add | 1298–1328 | 新增品牌页 |
| screen-flavor-detail | 1329–1368 | 风味详情页 |
| screen-brand-detail | 1369–1400 | 品牌详情页 |
| screen-stats | 1401–1471 | 统计页 |
| save-dialog | 1472–1490 | 编辑保存确认对话框 |
| JS 逻辑 | 1492–末尾 | 交互参考 |
| CSS 基础段 | 1–628 | tokens/app 样式 |

## Global Constraints

- 框架：**原生小程序**（WXML+WXSS+JS，CommonJS），不引入 Taro/uni-app/TS（2026-09-07 复核定稿）
- 页面规模：**16 页**（规格书 v1.3），app.json 全量注册
- 尺寸换算：原型 px → **rpx ×2**；1px 描边写 2rpx
- 按钮统一规格：**高 88rpx / 圆角 24rpx / 间距 24rpx / 字号 28rpx**
- 四态配色：养豆中 `#FAAD14` / 在喝 `#52C41A` / 抓紧喝 `#F97316` / 喝完 `#9CA3AF`；评分 `#FF6E20`；开喝绿 `#07C160`；暖纸底 `#F3EDE2`
- 属性图标：`assets/icons/proposal1/` PNG，60×60rpx，8 项底色见规格书 3.4
- API Key 只存云函数环境变量；模型 ID 走 config 集合+管理页；前端不得出现任何密钥
- beans 增加 `country` 字段（国家与产区拆分）；国旗用 emoji 映射
- api 层每个函数必须是 Promise；页面禁止直接 require mock
- 每 Task 结束 `git commit`（`feat:`/`test:`/`chore:` 前缀）
- 测试：纯函数先写失败测试再实现，`node --test miniprogram/tests/`

---

### Task 1: 工程骨架与设计 token

**Files:**
- Create: `miniprogram/project.config.json`、`app.json`、`app.js`、`app.wxss`、`sitemap.json`
- Create: `miniprogram/styles/tokens.wxss`、`miniprogram/config/env.js`
- Create: 16 个占位页（4 件套）
- Copy: `assets/icons/proposal1/*.png` → `miniprogram/assets/icons/proposal1/`

**Interfaces:**
- Produces: tokens.wxss 全部 CSS 变量与 `.btn/.card` 全局类（后续所有任务消费）；16 页注册；`config/env.js`（`USE_CLOUD:false` / `CLOUD_ENV_ID:''`）为阶段③唯一切换点

- [ ] **Step 1: 配置文件**

`project.config.json`：

```json
{
  "miniprogramRoot": "./",
  "projectname": "coffeeApp",
  "appid": "touristappid",
  "compileType": "miniprogram",
  "setting": { "es6": true, "postcss": true, "minified": true },
  "libVersion": "latest"
}
```

`sitemap.json`：`{ "rules": [{ "action": "allow", "page": "*" }] }`

`config/env.js`：

```javascript
// 阶段② mock 模式；阶段③ 填 envId 并把 USE_CLOUD 置 true
module.exports = { USE_CLOUD: false, CLOUD_ENV_ID: '' };
```

- [ ] **Step 2: tokens.wxss 与 app.wxss**

`styles/tokens.wxss`：

```css
page {
  --bg-paper: #F3EDE2; --card: #FFFDF8;
  --ink: #1A1B1C; --ink-2: #6B7280; --ink-3: #9CA3AF; --line: #EDE7DC;
  --accent: #C96F4A; --accent-score: #FF6E20; --green: #07C160;
  --status-resting: #FAAD14; --status-drinking: #52C41A;
  --status-hurry: #F97316; --status-finished: #9CA3AF;
  --attr-roast-date: #FFE5DB; --attr-variety: #F0E4DA; --attr-process: #D7EBF7; --attr-origin: #DCEEDA;
  --attr-altitude: #F0F3CF; --attr-roast-level: #FFE9BC; --attr-brew: #FBE4D2; --attr-weight: #E7E2F1;
  --font-display: "Songti SC", "STSong", Georgia, serif;
  --btn-h: 88rpx; --btn-radius: 24rpx; --btn-gap: 24rpx;
}
```

`app.wxss`：

```css
@import "styles/tokens.wxss";
page { background: var(--bg-paper); color: var(--ink); font-size: 28rpx; }
.card { background: var(--card); border-radius: 24rpx; }
.btn { height: var(--btn-h); line-height: var(--btn-h); border-radius: var(--btn-radius);
  font-size: 28rpx; text-align: center; padding: 0 24rpx; }
.btn::after { border: none; }
.btn-primary { background: var(--green); color: #fff; }
.btn-score { background: var(--accent-score); color: #fff; }
.btn-gray { background: #EFEAE0; color: var(--ink-2); }
.btn-outline-orange { background: #fff; color: var(--status-hurry); border: 2rpx solid var(--status-hurry); }
.btn-cream { background: #F5EEDC; color: #6B4F2A; }
.btn-muted { background: #E5E5E5; color: var(--ink-2); }
.w { width: 100%; }
```

- [ ] **Step 3: app.json 16 页 + 占位页生成**

`app.json` pages 数组：

```json
["pages/shelf/shelf", "pages/add/add", "pages/add/camera/camera", "pages/add/upload/upload",
 "pages/add/processing/processing", "pages/add/confirm/confirm", "pages/bean/detail",
 "pages/stats/stats", "pages/brand/list", "pages/brand/add", "pages/brand/detail",
 "pages/flavor/list", "pages/flavor/detail", "pages/family/bind", "pages/mine/mine", "pages/admin/admin"]
```

window：`navigationBarBackgroundColor:#F3EDE2`、`navigationBarTextStyle:black`；加 `"style":"v2"`、`"sitemapLocation":"sitemap.json"`、`"lazyCodeLoading":"requiredComponents"`。

生成占位页：

```bash
cd miniprogram
for p in pages/shelf/shelf pages/add/add pages/add/camera/camera pages/add/upload/upload pages/add/processing/processing pages/add/confirm/confirm pages/bean/detail pages/stats/stats pages/brand/list pages/brand/add pages/brand/detail pages/flavor/list pages/flavor/detail pages/family/bind pages/mine/mine pages/admin/admin; do
  mkdir -p "$(dirname "$p")"; touch "$p.js" "$p.wxml" "$p.wxss" "$p.json"
  printf '{ "usingComponents": {} }\n' > "$p.json"; printf 'Page({})\n' > "$p.js"
done
```

`app.js`：

```javascript
const env = require('./config/env');
App({
  onLaunch() {
    if (env.USE_CLOUD && wx.cloud) wx.cloud.init({ env: env.CLOUD_ENV_ID, traceUser: true });
  },
  globalData: { pendingPhotos: null, mainIndex: 0 },
});
```

复制图标：`mkdir -p miniprogram/assets/icons && cp -R assets/icons/proposal1 miniprogram/assets/icons/`

- [ ] **Step 4: 编译验证**

开发者工具导入 `miniprogram/`：编译通过、无报错。

- [ ] **Step 5: Commit**

```bash
git add miniprogram
git commit -m "chore: 阶段②工程骨架——16页注册/tokens/env配置/图标资产"
```

---

### Task 2: utils/status.js 四态计算（TDD）

**Files:**
- Create: `miniprogram/utils/status.js`
- Test: `miniprogram/tests/status.test.js`

**Interfaces:**
- Produces: `getRestDays(roastDate) -> 20|25`；`computeStatus(bean, now?) -> { status, restDays, daysLeft, dayOfPeak }`；`statusMeta(status) -> { label, color }`；`statusBarText(bean, now?) -> string`
- 约定：`bean.roastDate` 为 `'YYYY-MM-DD'`；`bean.statusOverride ∈ 'resting'|'drinking'|'hurry'|'finished'|undefined`；hurry/finished 永不自动进入（规格书 3.3）

- [ ] **Step 1: 失败测试** `tests/status.test.js`

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { getRestDays, computeStatus, statusBarText } = require('../utils/status');
const d = (s) => new Date(s + 'T00:00:00');

test('养豆期：5-10月20天，其他25天', () => {
  assert.equal(getRestDays(d('2026-05-01')), 20);
  assert.equal(getRestDays(d('2026-10-31')), 20);
  assert.equal(getRestDays(d('2026-04-30')), 25);
  assert.equal(getRestDays(d('2026-11-01')), 25);
});
test('未到期→养豆中含剩余天数', () => {
  const r = computeStatus({ roastDate: '2026-08-28' }, d('2026-09-07'));
  assert.equal(r.status, 'resting'); assert.equal(r.restDays, 20); assert.equal(r.daysLeft, 11);
});
test('到期自动转在喝，dayOfPeak 从1起', () => {
  const r = computeStatus({ roastDate: '2026-08-28' }, d('2026-09-20'));
  assert.equal(r.status, 'drinking'); assert.equal(r.dayOfPeak, 4);
});
test('手动覆盖 hurry/finished/drinking/resting', () => {
  const base = { roastDate: '2026-09-01' };
  assert.equal(computeStatus({ ...base, statusOverride: 'hurry' }, d('2026-09-03')).status, 'hurry');
  assert.equal(computeStatus({ ...base, statusOverride: 'finished' }, d('2026-09-03')).status, 'finished');
  assert.equal(computeStatus({ ...base, statusOverride: 'drinking' }, d('2026-09-03')).status, 'drinking');
  assert.equal(computeStatus({ ...base, statusOverride: 'resting' }, d('2026-09-03')).status, 'resting');
});
test('状态条文案（规格书3.4）', () => {
  const now = d('2026-09-07');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200 }, now), '还需11天 · 养豆期20天');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'drinking' }, now), '200g · 最佳赏味第11天');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'hurry' }, now), '200g · 风味衰退期 · 尽快饮用');
  assert.equal(statusBarText({ roastDate: '2026-08-28', weight: 200, statusOverride: 'finished' }, now), '200g · 本袋已喝完');
});
```

- [ ] **Step 2: 确认失败** — Run: `node --test miniprogram/tests/status.test.js` → FAIL（模块不存在）

- [ ] **Step 3: 实现** `utils/status.js`

```javascript
// 四态模型与养豆期计算（规格书3.3；hurry 永不自动进入）
const toDate = (v) => (v instanceof Date ? v : new Date(v + 'T00:00:00'));
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (a, b) => Math.round((sod(b) - sod(a)) / 86400000);

function getRestDays(roastDate) {
  const m = toDate(roastDate).getMonth() + 1;
  return m >= 5 && m <= 10 ? 20 : 25;
}
function computeStatus(bean, now = new Date()) {
  const restDays = getRestDays(bean.roastDate);
  const since = daysBetween(toDate(bean.roastDate), now);
  const daysLeft = restDays - since;
  const auto = daysLeft > 0 ? 'resting' : 'drinking';
  const ov = bean.statusOverride;
  const status = (ov === 'hurry' || ov === 'finished' || ov === 'resting') ? ov : (ov === 'drinking' ? 'drinking' : auto);
  return { status, restDays, daysLeft, dayOfPeak: daysLeft > 0 ? null : since - restDays + 1 };
}
const META = { resting: { label: '养豆中', color: '#FAAD14' }, drinking: { label: '在喝', color: '#52C41A' },
  hurry: { label: '抓紧喝', color: '#F97316' }, finished: { label: '喝完', color: '#9CA3AF' } };
const statusMeta = (s) => META[s];
function statusBarText(bean, now = new Date()) {
  const { status, daysLeft, restDays, dayOfPeak } = computeStatus(bean, now);
  const w = bean.weight ? bean.weight + 'g · ' : '';
  if (status === 'resting') return '还需' + daysLeft + '天 · 养豆期' + restDays + '天';
  if (status === 'drinking') return w + '最佳赏味第' + dayOfPeak + '天';
  if (status === 'hurry') return w + '风味衰退期 · 尽快饮用';
  return w + '本袋已喝完';
}
module.exports = { getRestDays, computeStatus, statusMeta, statusBarText };
```

- [ ] **Step 4: 确认通过** — Run: `node --test miniprogram/tests/status.test.js` → PASS

- [ ] **Step 5: Commit** — `git add miniprogram/utils miniprogram/tests && git commit -m "feat: 养豆期规则与四态计算(status.js)+TDD"`

---

### Task 3: utils/format.js（TDD）

**Files:**
- Create: `miniprogram/utils/format.js`；Test: `miniprogram/tests/format.test.js`

**Interfaces:**
- Produces: `formatDate(v, sep='.') -> '2026.08.28'`；`daysAgo(v, now?) -> number`；`avgScore(a,b) -> '4.5'|''`（均空返回空串，单方按单方）；`firstChar(name) -> string`（空返回 `'?'`）

- [ ] **Step 1: 失败测试**

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { formatDate, daysAgo, avgScore, firstChar } = require('../utils/format');

test('formatDate 默认点分', () => {
  assert.equal(formatDate('2026-08-28'), '2026.08.28');
  assert.equal(formatDate('2026-08-28', '-'), '2026-08-28');
});
test('daysAgo 按自然日', () => assert.equal(daysAgo('2026-09-05', new Date('2026-09-07T12:00:00')), 2));
test('avgScore 单方/双方/空', () => {
  assert.equal(avgScore(4, null), '4.0'); assert.equal(avgScore(4, 5), '4.5'); assert.equal(avgScore(null, null), '');
});
test('firstChar', () => { assert.equal(firstChar('铁皮卡'), '铁'); assert.equal(firstChar(''), '?'); });
```

- [ ] **Step 2: 确认失败** — `node --test miniprogram/tests/format.test.js` → FAIL

- [ ] **Step 3: 实现**

```javascript
function formatDate(v, sep = '.') {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v + 'T00:00:00');
  const p = (n) => String(n).padStart(2, '0');
  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate())].join(sep);
}
function daysAgo(v, now = new Date()) {
  const a = new Date(v + 'T00:00:00'); const b = new Date(now); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
function avgScore(a, b) {
  const vals = [a, b].filter((x) => typeof x === 'number');
  if (!vals.length) return '';
  return (vals.reduce((s, x) => s + x, 0) / vals.length).toFixed(1);
}
function firstChar(name) { return name ? Array.from(name)[0] : '?'; }
module.exports = { formatDate, daysAgo, avgScore, firstChar };
```

- [ ] **Step 4: 确认通过** — `node --test miniprogram/tests/` → PASS

- [ ] **Step 5: Commit** — `git commit -m "feat: format.js 日期/天数/均分工具+TDD"`

---

### Task 4: api 层与 mock 数据

**Files:**
- Create: `miniprogram/api/{cloud,flags,bean,brand,flavor,stats,user,admin}.js`
- Create: `miniprogram/mock/{beans,brands,flavors,family}.js`
- Test: `miniprogram/tests/api.test.js`

**Interfaces（全部 Promise，阶段③云实现同签名）：**

```javascript
// api/bean.js
listBeans({ status='all', keyword='' })  // -> [beanView]，status∈all|resting|drinking|hurry|finished
getBean(id) -> beanView                  createBean(data) -> beanView
updateBean(id, patch) -> beanView        removeBean(id) -> {ok:true}
setBeanStatus(id, status|'auto') -> beanView   // 'auto'=清除手动覆盖
// api/brand.js
listBrands({ countries=[] }) -> [brand&{beanCount}]    getBrand(id) -> { brand, beans, avgScore }
createBrand({ name,nameEn,logo,country,description }) -> brand
// api/flavor.js
listFlavors() -> [{category, items}]     createFlavor({name,category}) -> flavor
updateFlavor(id, patch) -> flavor        removeFlavor(id) -> {ok}（被引用 reject Error('IN_USE')）
// api/stats.js
getStats() -> { totalWeight, brandCount, countryCount, varietyCount,
  statusDist:{resting,drinking,hurry,finished}, processDist:{法:数},
  countryDist:[{name,flag,count}], varietyDist:[{name,count}] }   // totalWeight 不含 finished（规格书3.8）
// api/user.js
bootstrap() -> { user|null, family|null }
createFamily() -> family                 joinFamily(code) -> family（错码 BAD_CODE / 满员 FULL）
updateProfile({nickname,avatarUrl}) -> user
setInviteEnabled(bool) -> family         regenerateInvite() -> family
// api/admin.js
getModelConfig() -> { modelVision, modelImage, source }
updateModelConfig(patch) -> config（非 owner reject Error('FORBIDDEN')）
```

- beanView：mock 返回前组装 `flag / brand / brandFlag / statusInfo(computeStatus) / statusText(statusBarText) / flavors([flavor])`，页面不重复计算
- 筛选规则：`status='drinking'` 不含 hurry（规格书 3.3）；排序 `drinking>resting>hurry>finished`，同级烘焙日期新在前

- [ ] **Step 1: mock 数据**

`mock/brands.js`（12 个内置，格式）：`{ _id:'b01', name:'Seesaw', nameEn:'Seesaw Coffee', logo:'', country:'中国', flag:'🇨🇳', description:'…', isBuiltin:true }`——覆盖中国/美国/日本/德国/丹麦/挪威/韩国/埃塞俄比亚。

`mock/flavors.js`（按规格书 3.6 表格**逐行补齐 40+**，7 分类）：格式 `{ _id:'f01', name:'草莓', category:'水果类', iconUrl:'', emoji:'🍓', isBuiltin:true }`。名称必须与规格书表格一致；emoji 合理占位（iconUrl 留空，阶段④ Seedream 生成后替换）。

`mock/beans.js`（4 袋覆盖四态；country/origin 拆分）：

```javascript
module.exports = [
  { _id:'bean01', brandId:'b02', name:'Bella Donovan', country:'埃塞俄比亚', origin:'耶加雪菲',
    variety:'74158', process:'水洗', altitude:'2200m', roastLevel:'浅', brewMethod:'手冲',
    weight:200, roastDate:'2026-08-28', inDate:'2026-09-01', flavorTagIds:['f01','f07','f09'],
    flavorDesc:'草莓、蜂蜜、黑巧', photos:[], statusOverride:undefined, isNew:true,
    myRating:4, wifeRating:null, myNotes:'', wifeNotes:'', createTime:'2026-09-01T10:00:00' },
  { _id:'bean02', brandId:'b03', name:'Komichi', country:'埃塞俄比亚', origin:'西达摩',
    variety:'瑰夏', process:'日晒', altitude:'1900m', roastLevel:'中浅', brewMethod:'手冲',
    weight:100, roastDate:'2026-07-10', inDate:'2026-07-20', flavorTagIds:['f05','f13'],
    flavorDesc:'茉莉、茶感', photos:[], statusOverride:undefined,
    myRating:5, wifeRating:4, myNotes:'', wifeNotes:'', createTime:'2026-07-20T10:00:00' },
  { _id:'bean03', brandId:'b04', name:'Kenya AA', country:'肯尼亚', origin:'涅里',
    variety:'SL28', process:'水洗', altitude:'1800m', roastLevel:'中', brewMethod:'通用',
    weight:250, roastDate:'2026-06-01', inDate:'2026-06-10', flavorTagIds:['f02','f03'],
    flavorDesc:'橙子、柠檬', photos:[], statusOverride:'hurry',
    myRating:null, wifeRating:5, myNotes:'', wifeNotes:'', createTime:'2026-06-10T10:00:00' },
  { _id:'bean04', brandId:'b05', name:'云南日晒', country:'中国', origin:'保山',
    variety:'卡杜拉', process:'日晒', altitude:'1200m', roastLevel:'中深', brewMethod:'意式',
    weight:340, roastDate:'2026-05-15', inDate:'2026-05-20', flavorTagIds:['f08','f10'],
    flavorDesc:'焦糖、榛子', photos:[], statusOverride:'finished',
    myRating:3, wifeRating:3, myNotes:'', wifeNotes:'', createTime:'2026-05-20T10:00:00' },
];
```

`mock/family.js`：

```javascript
module.exports = {
  MOCK_SELF_OPENID: 'mock-self', MOCK_PARTNER_OPENID: 'mock-partner',
  users: [
    { _openid:'mock-self', nickname:'本人', avatarUrl:'', role:'owner', familyId:'fam01' },
    { _openid:'mock-partner', nickname:'毛小毛', avatarUrl:'', role:'member', familyId:'fam01' },
  ],
  family: { _id:'fam01', inviteCode:'K7F2QX', inviteEnabled:true },
};
```

- [ ] **Step 2: api 层实现**

`api/cloud.js`：

```javascript
const env = require('../config/env');
function call(name, data) { // 阶段③启用；签名即云函数协议 { name, action, ...payload }
  return wx.cloud.callFunction({ name, data }).then((r) => r.result);
}
module.exports = { call, enabled: () => env.USE_CLOUD };
```

`api/flags.js`：

```javascript
const MAP = { '中国':'🇨🇳', '美国':'🇺🇸', '日本':'🇯🇵', '德国':'🇩🇪', '丹麦':'🇩🇰', '挪威':'🇳🇴', '韩国':'🇰🇷',
  '埃塞俄比亚':'🇪🇹', '肯尼亚':'🇰🇪', '巴拿马':'🇵🇦', '哥伦比亚':'🇨🇴', '危地马拉':'🇬🇹', '巴西':'🇧🇷',
  '印度尼西亚':'🇮🇩', '卢旺达':'🇷🇼', '洪都拉斯':'🇭🇳', '哥斯达黎加':'🇨🇷', '也门':'🇾🇪' };
module.exports = { getFlag: (c) => MAP[c] || '🏳️', COUNTRIES: Object.keys(MAP) };
```

`api/bean.js`（mock 分支；每个函数先判 `enabled()` 走 `call('bean', {action,...})`，否则操作内存 MOCK）：

```javascript
const { enabled, call } = require('./cloud');
const { computeStatus, statusBarText } = require('../utils/status');
const { getFlag } = require('./flags');
let MOCK = require('../mock/beans').map((x) => ({ ...x }));
const BRANDS = require('../mock/brands');
const FLAVORS = require('../mock/flavors');
const clone = (x) => JSON.parse(JSON.stringify(x));

function decorate(b) {
  const brand = BRANDS.find((x) => x._id === b.brandId) || {};
  const v = clone(b);
  v.flag = getFlag(b.country); v.brand = brand.name || ''; v.brandFlag = brand.flag || '';
  v.statusInfo = computeStatus(b); v.statusText = statusBarText(b);
  v.flavors = (b.flavorTagIds || []).map((id) => FLAVORS.find((f) => f._id === id)).filter(Boolean);
  return v;
}
const ORDER = { drinking: 0, resting: 1, hurry: 2, finished: 3 };

function listBeans({ status = 'all', keyword = '' } = {}) {
  if (enabled()) return call('bean', { action: 'list', status, keyword });
  let list = MOCK.map(decorate);
  if (status === 'drinking') list = list.filter((b) => b.statusInfo.status === 'drinking');
  else if (status !== 'all') list = list.filter((b) => b.statusInfo.status === status);
  const k = keyword.trim();
  if (k) list = list.filter((b) => [b.name, b.brand, b.origin, b.variety, b.country].some((s) => s && s.includes(k)));
  list.sort((a, b) => ORDER[a.statusInfo.status] - ORDER[b.statusInfo.status] || (a.roastDate < b.roastDate ? 1 : -1));
  return Promise.resolve(list);
}
function getBean(id) {
  if (enabled()) return call('bean', { action: 'get', id });
  const b = MOCK.find((x) => x._id === id);
  return b ? Promise.resolve(decorate(b)) : Promise.reject(new Error('NOT_FOUND'));
}
function createBean(data) {
  if (enabled()) return call('bean', { action: 'create', data });
  const bean = { ...clone(data), _id: 'bean' + Date.now(), isNew: true, myRating: null, wifeRating: null,
    myNotes: '', wifeNotes: '', inDate: data.inDate || new Date().toISOString().slice(0, 10) };
  MOCK.unshift(bean);
  return Promise.resolve(decorate(bean));
}
function updateBean(id, patch) {
  if (enabled()) return call('bean', { action: 'update', id, patch });
  const i = MOCK.findIndex((x) => x._id === id);
  if (i < 0) return Promise.reject(new Error('NOT_FOUND'));
  MOCK[i] = { ...MOCK[i], ...clone(patch) };
  return Promise.resolve(decorate(MOCK[i]));
}
function removeBean(id) {
  if (enabled()) return call('bean', { action: 'remove', id });
  MOCK = MOCK.filter((x) => x._id !== id);
  return Promise.resolve({ ok: true });
}
function setBeanStatus(id, s) { return updateBean(id, { statusOverride: s === 'auto' ? undefined : s }); }
module.exports = { listBeans, getBean, createBean, updateBean, removeBean, setBeanStatus };
```

`api/brand.js` / `api/flavor.js` / `api/stats.js` / `api/user.js` / `api/admin.js`：同上模式实现，要点——
- brand：`listBrands` 内联 beanCount（跨 api 直接调 beanApi.listBeans）；`getBrand` 均分=该品牌豆所有评分（两人合并）的 `avgScore` 变参扩展（实现为对数组求均值，复用 utils/format 思路或内联三行）
- flavor：`removeFlavor` 先查 beans 引用，被引用 reject `Error('IN_USE')`
- stats：**聚合逻辑抽纯函数 `aggregate(beans)` 并导出**（statusDist 四态计数；countryDist/varietyDesc 按计数降序；totalWeight 排除 finished）
- user：bootstrap/createFamily/joinFamily/updateProfile/setInviteEnabled/regenerateInvite，错误码 `BAD_CODE`/`FULL`
- admin：mock 里 `isOwner()` 按 MOCK_SELF_OPENID 判 role，非 owner `updateModelConfig` reject `FORBIDDEN`

- [ ] **Step 3: 失败测试（契约）** `tests/api.test.js`

```javascript
const test = require('node:test');
const assert = require('node:assert');
const beanApi = require('../api/bean');
const brandApi = require('../api/brand');
const flavorApi = require('../api/flavor');
const statsApi = require('../api/stats');
const userApi = require('../api/user');
const adminApi = require('../api/admin');

test('排序：在喝>养豆中>抓紧喝>喝完', async () => {
  const list = await beanApi.listBeans({});
  assert.equal(list[0].statusInfo.status, 'drinking');
  assert.equal(list[list.length - 1].statusInfo.status, 'finished');
});
test('在喝筛选不含抓紧喝；hurry 专项', async () => {
  const d = await beanApi.listBeans({ status: 'drinking' });
  assert.ok(d.every((b) => b.statusInfo.status === 'drinking'));
  const h = await beanApi.listBeans({ status: 'hurry' });
  assert.equal(h.length, 1); assert.equal(h[0]._id, 'bean03');
});
test('关键词命中品牌/豆种/国家', async () => {
  const r = await beanApi.listBeans({ keyword: 'Blue' });
  assert.equal(r.length, 1); assert.equal(r[0]._id, 'bean01');
});
test('beanView 视图字段', async () => {
  const b = await beanApi.getBean('bean01');
  assert.equal(b.flag, '🇪🇹'); assert.equal(b.brand, 'Blue Bottle');
  assert.ok(b.statusText.includes('还需')); assert.equal(b.flavors.length, 3);
});
test('setBeanStatus 开喝→覆盖→还原', async () => {
  const b = await beanApi.setBeanStatus('bean01', 'drinking');
  assert.equal(b.statusInfo.status, 'drinking'); assert.ok(b.statusText.startsWith('200g'));
  await beanApi.setBeanStatus('bean01', 'auto');
});
test('createBean 默认字段', async () => {
  const b = await beanApi.createBean({ brandId:'b01', name:'测试豆', country:'中国', origin:'保山',
    variety:'', process:'水洗', altitude:'', roastLevel:'中', brewMethod:'手冲', weight:200,
    roastDate:'2026-09-01', flavorTagIds:[], flavorDesc:'', photos:[] });
  assert.equal(b.isNew, true); assert.ok(b.inDate);
});
test('getBrand beans+均分', async () => {
  const r = await brandApi.getBrand('b03');
  assert.equal(r.beans.length, 1); assert.equal(r.avgScore, '4.5');
});
test('removeFlavor 被引用拒绝', async () => {
  await assert.rejects(() => flavorApi.removeFlavor('f01'), /IN_USE/);
});
test('stats 聚合', async () => {
  const s = await statsApi.getStats();
  assert.equal(s.statusDist.hurry, 1); assert.equal(s.statusDist.finished, 1);
  assert.ok(s.countryDist.find((c) => c.name === '埃塞俄比亚' && c.count === 2));
  assert.equal(s.totalWeight, 550); // 200+100+250，喝完不计
});
test('joinFamily 错码拒绝；模型配置可写', async () => {
  await assert.rejects(() => userApi.joinFamily('XXXXXX'), /BAD_CODE/);
  const cfg = await adminApi.updateModelConfig({ modelVision: 'ep-test-1' });
  assert.equal(cfg.modelVision, 'ep-test-1');
});
```

- [ ] **Step 4: 确认通过** — `node --test miniprogram/tests/` → 全绿

- [ ] **Step 5: Commit** — `git commit -m "feat: api层8模块与mock(四态样例/品牌12/风味40+)，签名与云开发一致"`

---

### Task 5: 基础组件四件

**Files:**
- Create: `miniprogram/components/{status-badge,flavor-tag,rating-stars,photo-strip}/*`（各 4 件套）

**Interfaces:**
- `<status-badge status="drinking" />`：色点+文字（消费 statusMeta）
- `<flavor-tag name emoji iconUrl size="{{48}}" />`：无白底图标+衬线斜体文字，6rpx 间距不重叠（iconUrl 空用 emoji，再空用 ☕）
- `<rating-stars value="{{4}}" readonly bind:change />`：1-5 星，readonly 不响应
- `<photo-strip photos="{{[]}}" current="{{0}}" bean-name bind:select bind:add />`：缩略条+「＋」追加位

- [ ] **Step 1: status-badge**

js：`Component({ properties:{ status:{type:String,value:'resting'} }, data:{meta:{}}, observers:{ status(v){ this.setData({ meta: statusMeta(v)||{} }); } } })`（顶部 `const { statusMeta } = require('../../utils/status')`）
wxml：`<view class="badge" style="--c:{{meta.color}}"><view class="dot"></view><text>{{meta.label}}</text></view>`
wxss：`.badge{display:inline-flex;align-items:center;gap:8rpx;font-size:20rpx;color:var(--c)} .dot{width:14rpx;height:14rpx;border-radius:50%;background:var(--c)}`
json：`{ "component": true }`

- [ ] **Step 2: flavor-tag**

```javascript
Component({ properties: { name: String, emoji: String, iconUrl: String, size: { type: Number, value: 48 } } });
```

```xml
<view class="ft"><image wx:if="{{iconUrl}}" src="{{iconUrl}}" class="ic" style="width:{{size}}rpx;height:{{size}}rpx;" />
  <text wx:else class="emoji">{{emoji || '☕'}}</text><text class="name">{{name}}</text></view>
```

```css
.ft { display:inline-flex; align-items:center; gap:6rpx; }
.ft .name { font-family:var(--font-display); font-style:italic; font-size:24rpx; color:var(--ink-2); }
```

- [ ] **Step 3: rating-stars**

```javascript
Component({
  properties: { value: { type: Number, value: 0 }, readonly: { type: Boolean, value: false } },
  data: { stars: [1,2,3,4,5] },
  methods: { onTap(e) { if (!this.properties.readonly) this.triggerEvent('change', { value: e.currentTarget.dataset.v }); } },
});
```

```xml
<view class="stars"><text wx:for="{{stars}}" wx:key="*this" data-v="{{item}}" bindtap="onTap"
  class="s {{item <= value ? 'on' : ''}}">★</text></view>
```

```css
.stars { display:inline-flex; gap:8rpx; } .s { font-size:40rpx; color:#E5DECF; } .s.on { color:#F5A623; }
```

- [ ] **Step 4: photo-strip**

```javascript
Component({
  properties: { photos: { type: Array, value: [] }, current: { type: Number, value: 0 } },
  methods: {
    select(e) { this.triggerEvent('select', { index: e.currentTarget.dataset.i }); },
    add() { this.triggerEvent('add'); },
  },
});
```

```xml
<view class="strip">
  <view wx:for="{{photos}}" wx:key="index" data-i="{{index}}" bindtap="select"
    class="cell {{index === current ? 'on' : ''}}"><image src="{{item}}" mode="aspectFill" class="img" /></view>
  <view class="cell add" bindtap="add">＋</view>
</view>
```

```css
.strip { display:flex; gap:16rpx; }
.cell { width:120rpx; height:120rpx; border-radius:16rpx; overflow:hidden; border:4rpx solid transparent; flex-shrink:0; }
.cell.on { border-color: var(--accent); }
.cell.add { display:flex; align-items:center; justify-content:center; color:var(--ink-3); font-size:40rpx; }
.img { width:100%; height:100%; }
```

- [ ] **Step 5: 编译验证** — 占位页临时引用四组件，渲染/星级可点正常后移除；`node --test` 仍全绿

- [ ] **Step 6: Commit** — `git commit -m "feat: 基础组件四件(status-badge/flavor-tag/rating-stars/photo-strip)"`

---

### Task 6: bean-card 与 attr-icon-bar

**Files:**
- Create: `miniprogram/components/{bean-card,attr-icon-bar}/*`

**Interfaces:**
- `<bean-card bean="{{beanView}}" bind:tap />`：照片（空则品牌首字色块）、烘焙度角标（浅/中/深色阶）、状态胶囊（养豆中显示"还需X天"）、⏰抓紧喝左上标签（仅 hurry）、NEW 角标（仅 isNew）、品牌名、豆名截断、均分 ★、风味图标≤3
- `<attr-icon-bar bean="{{bean}}" />`：8 项 4 列图标条（60×60rpx PNG+马卡龙底+数值+标签；冲煮按 brewMethod 切 brewing/espresso_roast/omni_roast.png；产区格=国家小字+产区值；末格克重）

- [ ] **Step 1: bean-card**

js：observers.bean 里算 `avg=avgScore(myRating,wifeRating)`、`first=firstChar(brand||name)`、`topFlavors=flavors.slice(0,3)`（require utils/format）。
wxml：

```xml
<view class="card bc">
  <view class="ph-wrap">
    <image wx:if="{{bean.photos.length}}" src="{{bean.photos[0]}}" mode="aspectFill" class="ph" />
    <view wx:else class="ph ph-fb"><text>{{first}}</text></view>
    <view class="roast {{'r' + bean.roastLevel.length}}">{{bean.roastLevel}}烘</view>
    <view class="pill" style="background: {{bean.statusInfo.status === 'resting' ? 'var(--status-resting)' : bean.statusInfo.status === 'drinking' ? 'var(--status-drinking)' : bean.statusInfo.status === 'hurry' ? 'var(--status-hurry)' : 'var(--status-finished)'}}">
      {{bean.statusInfo.status === 'resting' ? '还需' + bean.statusInfo.daysLeft + '天' : bean.statusInfo.status === 'finished' ? '喝完' : '在喝'}}</view>
    <view wx:if="{{bean.statusInfo.status === 'hurry'}}" class="hurry">⏰ 抓紧喝</view>
    <view wx:if="{{bean.isNew}}" class="new">NEW</view>
  </view>
  <view class="info">
    <view class="brand">{{bean.brand}}</view>
    <view class="name">{{bean.name}}</view>
    <view class="meta">
      <view class="flavors"><flavor-tag wx:for="{{topFlavors}}" wx:key="_id" name="{{item.name}}" emoji="{{item.emoji}}" size="{{36}}" /></view>
      <text wx:if="{{avg}}" class="avg">★{{avg}}</text>
    </view>
  </view>
</view>
```

wxss 关键（其余对照原型 629–757 ×2）：`ph-wrap` 高 300rpx；`.ph-fb` 米棕底衬线首字；烘焙度三阶底色 `#D9B779/#A9713C/#5C3A21`（用 roastLevel.length 区分浅=1/中=2/深=2——注意「中浅」「中深」也含「中」，改为在 js observers 里输出 `roastCls: {'浅':'r1','中浅':'r1','中':'r2','中深':'r3','深':'r3'}[bean.roastLevel]`，wxml 用 `class="roast {{roastCls}}"`）；hurry 标签橙底白字左下；NEW 橙底右上。
json：`{ "component": true, "usingComponents": { "flavor-tag": "../flavor-tag/flavor-tag" } }`

- [ ] **Step 2: attr-icon-bar**

js（8 项数据驱动，顺序=规格书 3.4 表）：

```javascript
const BASE = '/assets/icons/proposal1/';
const BREW_ICON = { '手冲': 'brewing.png', '意式': 'espresso_roast.png', '通用': 'omni_roast.png' };
Component({
  properties: { bean: { type: Object, value: {} } },
  data: { items: [] },
  observers: {
    bean(b) {
      if (!b || !b._id) return;
      this.setData({ items: [
        { icon: BASE + 'roast_date.png',    bg: 'var(--attr-roast-date)',  value: (b.roastDate || '').split('-').join('.'), label: '烘焙日期' },
        { icon: BASE + 'bean_variety.png',  bg: 'var(--attr-variety)',     value: b.variety || '—', label: '豆种' },
        { icon: BASE + 'process_method.png',bg: 'var(--attr-process)',     value: b.process || '—', label: '处理法' },
        { icon: BASE + 'country_region.png',bg: 'var(--attr-origin)',      value: b.origin || '—', label: '产区', sub: b.country },
        { icon: BASE + 'altitude.png',      bg: 'var(--attr-altitude)',    value: b.altitude || '—', label: '海拔' },
        { icon: BASE + 'roast_level.png',   bg: 'var(--attr-roast-level)', value: b.roastLevel ? b.roastLevel + '烘' : '—', label: '烘焙度' },
        { icon: BASE + (BREW_ICON[b.brewMethod] || 'omni_roast.png'), bg: 'var(--attr-brew)', value: b.brewMethod || '—', label: '冲煮' },
        { icon: BASE + 'bean_weight.png',   bg: 'var(--attr-weight)',      value: b.weight ? b.weight + 'g' : '—', label: '克重' },
      ] });
    },
  },
});
```

wxml：

```xml
<view class="bar">
  <view wx:for="{{items}}" wx:key="label" class="cell" style="background:{{item.bg}};">
    <image src="{{item.icon}}" class="ic" />
    <text wx:if="{{item.sub}}" class="sub">{{item.sub}}</text>
    <text class="val">{{item.value}}</text>
  </view>
</view>
```

wxss：`.bar{display:grid;grid-template-columns:repeat(4,1fr);gap:20rpx 16rpx}`；cell 圆角 20rpx 居中纵向布局；`.ic{width:60rpx;height:60rpx}`；sub 16rpx 灰、val 20rpx 半粗。

- [ ] **Step 3: 编译验证** — 临时挂到占位页传 `beanApi.getBean('bean01')` 结果：8 格渲染、冲煮图标 brewing.png、产区格含国家小字；验证后移除

- [ ] **Step 4: Commit** — `git commit -m "feat: bean-card卡片与attr-icon-bar属性图标条"`

---

### Task 7: brew-animation 冲煮动画

**Files:**
- Create: `miniprogram/components/brew-animation/*`

**Interfaces:**
- Produces: `<brew-animation />` 10 秒循环纯 CSS 动画（3 豆碎粉 → V60 滤杯 → 细口壶注水 → 滴入分享壶液面渐升 → 淡出重来），零依赖

- [ ] **Step 1: 提取原型动画** — `rg -n "brew|@keyframes" docs/prototype.html` 定位 screen-processing（858–893）对应样式块，整段搬运 ×2 换算 rpx，keyframes 秒数不变

- [ ] **Step 2: 组件化** — wxml 舞台结构（beans/powder/v60/pot/drops/server+liquid 六组节点）、wxss 动画、`js: Component({})`、`json: { "component": true }`；确认 6 组 keyframes 齐全

- [ ] **Step 3: 编译验证** — 临时挂载：循环播放无长帧（Performance 面板），10 秒一轮；验证后移除

- [ ] **Step 4: Commit** — `git commit -m "feat: 冲煮动画组件(原型纯CSS迁移)"`

---

### Task 8: 货架页（pages/shelf/shelf）

**Files:**
- Modify: `miniprogram/pages/shelf/shelf.{wxml,wxss,js,json}`（Task 1 占位）

**Interfaces:**
- Consumes: `beanApi.listBeans`、`bean-card`
- Produces: 跳转约定——`/pages/add/add`（➕）、`/pages/bean/detail?id=`（卡片）、`/pages/stats/stats` `/pages/brand/list` `/pages/flavor/list`（☰ 菜单）；下拉刷新

- [ ] **Step 1: JS（结构与数据流对照原型 629–757）**

```javascript
const beanApi = require('../../api/bean');
const FILTERS = [
  { key: 'all', label: '☕ 全部' }, { key: 'resting', label: '🟡 养豆中' },
  { key: 'drinking', label: '🟢 在喝' }, { key: 'hurry', label: '🟠 抓紧喝' }, { key: 'finished', label: '⚪ 喝完' },
];
Page({
  data: { beans: [], loaded: false, keyword: '', filter: 'all',
    filterOpen: false, menuOpen: false, filters: [], filterLabel: '☕ 全部' },
  onShow() { this.refresh(); },
  refresh() {
    const { filter, keyword } = this.data;
    return beanApi.listBeans({ status: filter, keyword }).then((beans) => {
      const counts = { all: beans.length, resting: 0, drinking: 0, hurry: 0, finished: 0 };
      beans.forEach((b) => counts[b.statusInfo.status]++);
      this.setData({ beans, loaded: true,
        filters: FILTERS.map((f) => ({ ...f, count: counts[f.key] })),
        filterLabel: FILTERS.find((f) => f.key === filter).label });
    });
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }, () => this.refresh()); },
  toggleFilter() { this.setData({ filterOpen: !this.data.filterOpen, menuOpen: false }); },
  toggleMenu() { this.setData({ menuOpen: !this.data.menuOpen, filterOpen: false }); },
  pickFilter(e) { this.setData({ filter: e.currentTarget.dataset.k, filterOpen: false }, () => this.refresh()); },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); },
  goStats() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/stats/stats' }); },
  goBrand() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/brand/list' }); },
  goFlavor() { this.setData({ menuOpen: false }); wx.navigateTo({ url: '/pages/flavor/list' }); },
  openBean(e) { wx.navigateTo({ url: '/pages/bean/detail?id=' + e.currentTarget.dataset.id }); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },
});
```

- [ ] **Step 2: WXML** — 顶栏三件：常驻搜索 input + 深色筛选胶囊（`{{filterLabel}} ▾`）+ 右上 ➕ 与 ☰；`filterOpen` 下拉五项含袋数；`menuOpen` 菜单三项（📊统计/🏷️品牌/🍓风味）；两列网格 `<view class="grid">` 循环 bean-card（data-id）；空态（`!beans.length && loaded`）：🫘 + 引导文案 + 「添加第一袋豆子」主按钮
- [ ] **Step 3: WXSS** — 对照原型 629–757 ×2：`grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24rpx;padding:24rpx}`；筛选下拉/菜单浮层深色圆角；空态居中
- [ ] **Step 4: json** — `{ "usingComponents": { "bean-card": "../../components/bean-card/bean-card" }, "enablePullDownRefresh": true }`

- [ ] **Step 5: 走查** — ① 搜索实时过滤 ② 下拉五项含袋数、在喝不含抓紧喝 ③ ➕/☰/卡片跳转 ④ 空态 ⑤ 下拉刷新

- [ ] **Step 6: Commit** — `git commit -m "feat: 货架页——搜索/筛选下拉/右上添加/菜单/两列网格"`

---

### Task 9: 添加页 + 拍照页 + 确认照片页

**Files:**
- Modify: `miniprogram/pages/add/add.*`、`pages/add/camera/camera.*`、`pages/add/upload/upload.*`

**Interfaces:**
- 页面间照片传递：`getApp().globalData.pendingPhotos = [临时路径]`；确认照片页产出 `pendingPhotos` + `globalData.mainIndex`（识别主图）
- 跳转：add→camera / confirm?mode=manual；camera→upload?from=camera；upload→processing；返回（‹）按来源回拍照页

- [ ] **Step 1: 添加页（对照原型 758–814）** — 四入口卡片：📷 AI拍照识别（→camera）、🖼️ 相册批量导入（`wx.chooseMedia({count:3, mediaType:['image'], sourceType:['album']})`→upload?from=album）、✏️ 手动录入（→confirm?mode=manual）、🔗 粘贴链接（toast「阶段④开放」）

- [ ] **Step 2: 拍照页（对照原型 815–834）**

`camera.json`：`{ "usingComponents": {}, "navigationStyle": "custom", "disableScroll": true }`

```xml
<camera device-position="back" flash="off" class="cam">
  <view class="mask">
    <view class="corner tl"></view><view class="corner tr"></view>
    <view class="corner bl"></view><view class="corner br"></view>
    <view class="hint">将豆袋置于取景框内</view>
    <view class="close" bindtap="onClose">✕</view>
    <view class="album-badge" bindtap="pickFromAlbum">🖼️ 3</view>
    <view class="shutter" bindtap="onShutter"></view>
  </view>
</camera>
```

```javascript
Page({
  onClose() { wx.navigateBack(); }, // 放弃本次添加
  onShutter() {
    wx.createCameraContext().takePhoto({ quality: 'high',
      success: (r) => this.gotoUpload([r.tempImagePath]),
      fail: () => wx.showToast({ title: '拍摄失败，请重试', icon: 'none' }) });
  },
  pickFromAlbum() {
    wx.chooseMedia({ count: 3, mediaType: ['image'], sourceType: ['album'],
      success: (r) => this.gotoUpload(r.tempFiles.map((f) => f.tempFilePath)) });
  },
  gotoUpload(photos) { getApp().globalData.pendingPhotos = photos;
    wx.navigateTo({ url: '/pages/add/upload/upload?from=camera' }); },
});
```

- [ ] **Step 3: 确认照片页（对照原型 835–857）** — 步骤条（②高亮）+ 大图预览（当前主图）+ 缩略条（photo-strip，点选切主图）+ 底部 [重新拍摄]（btn-gray）+ [✨ 确认使用]（btn-primary，flex 1.4）：

```javascript
Page({
  data: { photos: [], current: 0, from: 'camera' },
  onLoad(options) {
    this.setData({ photos: getApp().globalData.pendingPhotos || [], from: options.from || 'camera' });
  },
  pick(e) { this.setData({ current: e.detail.index }); },
  retake() { wx.navigateBack({ delta: this.data.from === 'album' ? 2 : 1 }); },
  confirmUse() {
    const g = getApp().globalData;
    g.pendingPhotos = this.data.photos; g.mainIndex = this.data.current;
    wx.navigateTo({ url: '/pages/add/processing/processing' });
  },
});
```

- [ ] **Step 4: 走查** — ① 快门→确认页显示照片 ② 相册 3 张→切主图橙描边 ③ 重拍按来源返回 ④ ✕ 放弃回货架链

- [ ] **Step 5: Commit** — `git commit -m "feat: 添加页/拍照页/确认照片页——主图选择与重拍"`

---

### Task 10: AI 识别中页（pages/add/processing）

**Files:**
- Modify: `pages/add/processing/processing.*`

**Interfaces:**
- Consumes: `brew-animation`
- Produces: 完成/跳过 → `wx.redirectTo('/pages/add/confirm/confirm?mode=ai')`；阶段④此处改调 recognizeBean 云函数

- [ ] **Step 1: 实现（对照原型 858–893）**

```javascript
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
```

深色沉浸页（json `navigationStyle:custom`）+ brew-animation 居中 + 文案轮播 + 「跳过」文字按钮。

- [ ] **Step 2: 走查** — 动画循环/文案 2s 轮播/跳过与自动完成均进确认页

- [ ] **Step 3: Commit** — `git commit -m "feat: AI识别中页——冲煮动画+文案轮播+跳过"`

---

### Task 11: 确认编辑页（入库/编辑双形态）

**Files:**
- Modify: `pages/add/confirm/confirm.*`

**Interfaces:**
- Consumes: `beanApi.{createBean,updateBean,getBean}`、`flavorApi.listFlavors`、`photo-strip`
- Produces:
  - 入库形态（`mode=ai|manual`）：标题「确认豆子信息」、主按钮「入库」→ `wx.reLaunch('/pages/shelf/shelf')`；显示步骤条+本次照片选封面（`mode=ai` 另显示 AI 提示条）
  - 编辑形态（`mode=edit&id=`）：标题「编辑豆子」、主按钮「保存」→ updateBean 后 `wx.navigateBack()`；返回 ‹ 无变更直接回详情，**有变更弹「是否保存修改？」**（保存/不保存/取消），不保存还原快照（原型 1472–1490，规格书 3.2 编辑复用模式）
  - 表单字段顺序（规格书 3.2.1④）：豆名/品牌/国家/产区/豆种/处理法/海拔/克重/烘焙度(5档)/冲煮(3档)/烘焙日期(picker)/风味标签(浮层多选)/描述
  - 联想 chips：国家（flags.COUNTRIES 前6，带国旗）、豆种（瑰夏/74158/铁皮卡/波旁/SL28/卡杜拉）、处理法（水洗/日晒/蜜处理/厌氧日晒/湿剥法）

- [ ] **Step 1: JS 双形态核心**

```javascript
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
    this.setData({ countryChips: COUNTRIES.slice(0, 6) });
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
      : beanApi.createBean(this.payload());
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
```

- [ ] **Step 2: WXML** — 自定义导航（‹ + 标题随形态）、步骤条（mode=ai 时第④步高亮）、photo-strip 选封面、AI 提示条（mode=ai）、表单 13 行（input/chips/segment/picker/风味标签触发浮层/textarea）、footer 主按钮、保存确认对话框（绿「保存」/灰「不保存」/文字「取消」）、风味浮层（分类分组多选 + 完成）
- [ ] **Step 3: WXSS** — 对照原型 894–1010 与 save-dialog 1472–1490 ×2；segment 胶囊选中橙；封面橙描边+✓
- [ ] **Step 4: json** — `{ "usingComponents": { "photo-strip": "../../../components/photo-strip/photo-strip" }, "navigationStyle": "custom" }`

- [ ] **Step 5: 走查** — ① 手动录入→chips 即填→入库回货架置顶 NEW ② ai 模式显示步骤条与照片封面 ③ 编辑改豆名→‹→三选对话框：不保存回详情数据未变 / 保存回详情已更新 / 取消留在编辑页 ④ 未变更直接返回 ⑤ 缺豆名/日期拦截

- [ ] **Step 6: Commit** — `git commit -m "feat: 确认编辑页双形态+变更三选确认+联想chips"`

---

### Task 12: 豆子详情页（pages/bean/detail）

**Files:**
- Modify: `pages/bean/detail.*`

**Interfaces:**
- Consumes: `beanApi.{getBean,updateBean,removeBean,setBeanStatus}`、`attr-icon-bar`、`rating-stars`、`status-badge`、`flavor-tag`
- Produces: 品牌行→`/pages/brand/detail?id=`；⋯ 菜单「编辑」→`/pages/add/confirm/confirm?mode=edit&id=`；删除→removeBean→navigateBack；评分弹层只改自己（myRating/myNotes）

- [ ] **Step 1: JS**

```javascript
const beanApi = require('../../api/bean');
const MAIN_BTN = { resting: { text: '开喝', cls: 'btn-primary' }, drinking: { text: '喝完', cls: 'btn-cream' },
  hurry: { text: '喝完', cls: 'btn-cream' }, finished: { text: '重新养豆', cls: 'btn-muted' } };

Page({
  data: { bean: {}, first: '', mainBtn: {}, moreOpen: false, ratingOpen: false, draft: 0, notes: '' },
  onLoad(options) { this.id = options.id; },
  onShow() { beanApi.getBean(this.id).then((b) =>
    this.setData({ bean: b, mainBtn: MAIN_BTN[b.statusInfo.status] })); },
  goBrand() { wx.navigateTo({ url: '/pages/brand/detail?id=' + this.data.bean.brandId }); },
  goEdit() { this.setData({ moreOpen: false });
    wx.navigateTo({ url: '/pages/add/confirm/confirm?mode=edit&id=' + this.id }); },
  toggleMore() { this.setData({ moreOpen: !this.data.moreOpen }); },
  setHurry() { beanApi.setBeanStatus(this.id, 'hurry').then(() => this.load()); }, // 按钮仅在喝时渲染
  advanceStatus() { // 主按钮一键直达：养豆中→开喝；在喝/抓紧→喝完；喝完→重新养豆
    const s = this.data.bean.statusInfo.status;
    const next = s === 'resting' ? 'drinking' : (s === 'finished' ? 'resting' : 'finished');
    beanApi.setBeanStatus(this.id, next).then(() => this.load()); },
  load() { beanApi.getBean(this.id).then((b) => this.setData({ bean: b, mainBtn: MAIN_BTN[b.statusInfo.status] })); },
  openRating() { this.setData({ ratingOpen: true, draft: this.data.bean.myRating || 0, notes: this.data.bean.myNotes || '' }); },
  closeRating() { this.setData({ ratingOpen: false }); },
  rateDraft(e) { this.setData({ draft: e.detail.value }); },
  onNotes(e) { this.setData({ notes: e.detail.value }); },
  saveRating() { beanApi.updateBean(this.id, { myRating: this.data.draft, myNotes: this.data.notes })
    .then(() => { this.setData({ ratingOpen: false }); this.load(); }); },
  confirmDelete() {
    wx.showModal({ title: '删除豆子', content: '删除后不可恢复，确定？', confirmColor: '#E5484D',
      success: (r) => { if (r.confirm) beanApi.removeBean(this.id).then(() => wx.navigateBack()); } });
  },
});
```

- [ ] **Step 2: WXML（对照原型 1011–1102）** — 照片 swiper（≥2 张才可滑）或首字占位；衬线大标题；品牌行 `{{bean.brandFlag}} {{bean.brand}} ›`；状态条（status-badge + 右侧 `{{bean.statusText}}`，底色随状态 4 色）；风味行（flavor-tag size=48）；`<attr-icon-bar bean="{{bean}}" />`；评分并排区（我的=可点弹层只改自己 / 毛小毛=readonly 展示）；⋯ 浮层菜单（编辑/分享待开发灰色/删除红）；footer：[评分 btn-score] + [⏰ 抓紧喝 btn-outline-orange（仅 drinking 渲染）] + [主状态按钮]；评分弹层（rating-stars + notes textarea + 保存）
- [ ] **Step 3: WXSS** — ×2 搬运：状态条底色 `resting #FFF8E6 / drinking #EAF7EA / hurry #FFF4EC / finished #F0F0F0`；风味行紧凑 6rpx 间距不重叠
- [ ] **Step 4: json** — 注册 `attr-icon-bar` / `rating-stars` / `status-badge` / `flavor-tag`

- [ ] **Step 5: 走查** — ① 四态主按钮与抓紧喝次按钮出现时机 ② 评分弹层仅自己可改 ③ 编辑→变更→返回弹三选 ④ 删除二次确认 ⑤ 品牌行跳转 ⑥ 单图不误滑

- [ ] **Step 6: Commit** — `git commit -m "feat: 豆子详情页——图标条/四态按钮/评分弹层/更多菜单"`

---

### Task 13: 统计页（pages/stats/stats）

**Files:**
- Modify: `pages/stats/stats.*`

**Interfaces:**
- Consumes: `statsApi.getStats`（aggregate 已测）

- [ ] **Step 1: 五段布局（对照原型 1401–1471）** — 深色汇总头（总克重/品牌数/产区数/豆种数）→ 状态三色占比条（drinking 段内嵌橙色 hurry 子段，宽度=count/total%）+ 各状态袋数 → 处理法计数行 → 国家横条图（国旗+国名+渐变条 `width:count/max*100%`+袋数）→ 豆种横条图 → canvas 2D 点阵地图+产区标注点+注释「X 个国家 · Y 袋 · 产区点位示意」→ 底部四指标

- [ ] **Step 2: 地图实现** — `wx.createSelectorQuery().in(this).select('#map').fields({node,size})` → canvas 2d；固定经纬锚点表（中国[104,35]、埃塞俄比亚[40,8]、肯尼亚[38,0]、巴西[-52,-10]、哥伦比亚[-73,4]、危地马拉[-90,15]、洪都拉斯[-87,15]、印度尼西亚[120,-2]、美国[-100,40]、也门[47,15]等）；固定种子伪随机点阵底图（暖灰 #D8CDBB），产区点 `#C96F4A` 半径 4+count/max*6；经纬→画布：`x=(lon+180)/360*W, y=(90-lat)/180*H`

- [ ] **Step 3: 走查** — mock 四袋：状态条黄/绿+橙子段/灰比例正确；埃塞 2 袋；总克重 550g；地图有标注点

- [ ] **Step 4: Commit** — `git commit -m "feat: 统计页——汇总/状态分布/国家豆种横条图/canvas点阵地图"`

---

### Task 14: 品牌三页（list / add / detail）

**Files:**
- Modify: `pages/brand/{list,add,detail}.*`

**Interfaces:**
- Consumes: `brandApi.{listBrands,getBrand,createBrand}`、`flags.COUNTRIES`
- Produces: list→add（➕+底部按钮）；detail→`/pages/bean/detail?id=`

- [ ] **Step 1: 列表页（对照原型 1166–1297）** — 行=logo 首字色块+品牌名+`{{flag}} {{country}}`+在库豆数；🚩 按钮→国家多选下拉（国旗前缀、勾选即时过滤、清空项）；返回 ‹；onLoad 拉全量国家集，refresh 按已选国家过滤

```javascript
const brandApi = require('../../api/brand');
Page({
  data: { brands: [], countries: [], picked: {}, filterOpen: false },
  onLoad() { brandApi.listBrands({}).then((all) => this.setData({
    all, countries: [...new Set(all.map((b) => b.country))].sort() })); },
  onShow() { this.refresh(); },
  refresh() {
    const cs = Object.keys(this.data.picked).filter((k) => this.data.picked[k]);
    return brandApi.listBrands({ countries: cs }).then((brands) => this.setData({ brands })); },
  toggleFilter() { this.setData({ filterOpen: !this.data.filterOpen }); },
  toggleCountry(e) { const k = e.currentTarget.dataset.c;
    this.setData({ ['picked.' + k]: !this.data.picked[k] }, () => this.refresh()); },
  clearFilter() { this.setData({ picked: {}, filterOpen: false }, () => this.refresh()); },
  goAdd() { wx.navigateTo({ url: '/pages/brand/add' }); },
  goDetail(e) { wx.navigateTo({ url: '/pages/brand/detail?id=' + e.currentTarget.dataset.id }); },
});
```

- [ ] **Step 2: 新增品牌页（对照原型 1298–1328）** — Logo 虚线占位（chooseMedia 1 张）、名称、国家输入+国旗快捷 chips（COUNTRIES 前 8）、介绍 textarea；`createBrand` → navigateBack 回品牌库
- [ ] **Step 3: 品牌详情页（对照原型 1369–1400）** — `getBrand(id)`：logo 大图、`{{flag}} {{country}}`、在库袋数、均分、豆子列表（bean-card，点击进豆子详情）

- [ ] **Step 4: 走查** — ① 多选过滤+清空 ② 新增即现 ③ 详情袋数/均分/豆子可点 ④ 返回链路

- [ ] **Step 5: Commit** — `git commit -m "feat: 品牌三页——国家多选筛选/新增/详情"`

---

### Task 15: 风味两页（list / detail）

**Files:**
- Modify: `pages/flavor/{list,detail}.*`

**Interfaces:**
- Consumes: `flavorApi.{listFlavors,createFlavor,updateFlavor,removeFlavor}`
- Produces: list→detail 传 `id`（新增 `mode=new`）；「重新生成图标」toast「阶段④开放」（genFlavorIcon）

- [ ] **Step 1: 维护页（对照原型 1103–1165）** — listFlavors 已分组直接渲染（组名+图标行）；搜索框按名过滤；‹ 返回；右上 ➕→detail?mode=new

- [ ] **Step 2: 详情页（对照原型 1329–1368）** — 编辑形态：图标大图（emoji 占位）、名称可编辑、分类 picker（水果/花香/甜感/坚果可可/香料/烘焙/其他 7 类）、[重新生成图标]（toast 阶段④）、[删除]（catch `IN_USE` → toast「该风味已被豆子使用，无法删除」）；新增形态：名称+分类→createFlavor→回维护页

- [ ] **Step 3: 走查** — ① 分组/搜索 ② 新增归入所选分类 ③ 改名生效 ④ 删除保护 ⑤ 未使用可删

- [ ] **Step 4: Commit** — `git commit -m "feat: 风味两页——分组维护/搜索/编辑与删除保护"`

---

### Task 16: 家庭绑定页 + 我的页 + 管理页

**Files:**
- Modify: `pages/family/bind.*`、`pages/mine/mine.*`、`pages/admin/admin.*`

**Interfaces:**
- Consumes: `userApi.{bootstrap,createFamily,joinFamily,updateProfile,setInviteEnabled,regenerateInvite}`、`adminApi.{getModelConfig,updateModelConfig}`
- Produces: bind 成功 → `wx.reLaunch('/pages/shelf/shelf')`；mine 为管理页唯一入口（仅 owner 可见）

- [ ] **Step 1: 家庭绑定页** — bootstrap：有 user+family 直接 `enter()`；无则选择界面：[🏠 创建家庭货架]（createFamily→enter）或 6 位码输入+加入（joinFamily；`BAD_CODE`→「邀请码不正确」、`FULL`→「家庭已满员」）

```javascript
const userApi = require('../../api/user');
Page({
  data: { mode: 'loading', code: '' },
  onLoad() { userApi.bootstrap().then(({ user, family }) => {
    if (user && family) return this.enter();
    this.setData({ mode: 'choose' }); }); },
  createFamily() { userApi.createFamily().then(() => this.enter()); },
  onCode(e) { this.setData({ code: e.detail.value.toUpperCase() }); },
  join() { userApi.joinFamily(this.data.code).then(() => this.enter())
    .catch((e) => wx.showToast({ title: e.message === 'BAD_CODE' ? '邀请码不正确' : '家庭已满员', icon: 'none' })); },
  enter() { wx.reLaunch({ url: '/pages/shelf/shelf' }); },
});
```

- [ ] **Step 2: 我的页** — bootstrap 渲染：头像昵称填写区（`<button open-type="chooseAvatar">` + `<input type="nickname">` → updateProfile）、家庭卡（邀请码大字 + 复制 `wx.setClipboardData` + 启用开关 setInviteEnabled + 重新生成 regenerateInvite）、入口列表（📊统计/🏷️品牌/🍓风味 + **⚙️ 管理页仅 owner 渲染**）

- [ ] **Step 3: 管理页（规格书 3.9）** — getModelConfig 回填两输入框（视觉模型 modelVision / 生图模型 modelImage）+ 显示来源标签（config/回退）；[保存] → updateModelConfig（mock 中 owner 通过）；`FORBIDDEN` → toast「仅家庭创建者可修改」；（P2）[测试连接] 占位 toast

- [ ] **Step 4: 走查** — ① 首启绑定页出现→创建家庭→进货架 ② 错码提示 ③ 我的页改昵称生效 ④ 邀请码复制/重置 ⑤ owner 可见管理页并保存模型配置 ⑥ member（mock 切 MOCK_PARTNER_OPENID 模拟）不可见

- [ ] **Step 5: Commit** — `git commit -m "feat: 家庭绑定/我的页(邀请码管理)/管理页(模型ID维护)"`

---

### Task 17: 全量走查与收尾

**Files:**
- Modify: 视走查结果修补各页

- [ ] **Step 1: 全量按钮走查** — 对照 `docs/prototype.html` 13 屏逐屏核对 16 页：每个按钮有响应、返回链路闭合、无死页（重点：货架↔统计/品牌/风味、详情↔编辑、四步入库链、品牌↔品牌详情、风味↔风味详情）
- [ ] **Step 2: 规格书 v1.3 对照** — 按规格书 3.1–3.9 逐节核对功能规则（四态、养豆期、筛选、评分权限、编辑复用、邀请码、模型配置）
- [ ] **Step 3: 测试回归** — `node --test miniprogram/tests/` 全绿
- [ ] **Step 4: 阶段②清单核销** — 更新 `docs/设计方案.md` 第二节阶段②状态为「完成」；记录遗留项（照片上传云存储、AI 真识别=阶段④）
- [ ] **Step 5: Commit** — `git commit -m "chore: 阶段②收尾——全量走查修正与文档核销"`

---

## 验收标准（阶段② Definition of Done）

1. 开发者工具编译零报错；16 页全部可达可操作
2. `node --test miniprogram/tests/` 全绿（status/format/api 契约）
3. 全流程可走通：首启绑定家庭 → 货架 → 四步入库（mock 识别）→ 详情四态切换与评分 → 编辑三选返回 → 统计/品牌/风味维护 → 管理页改模型 ID
4. 视觉与 prototype.html 逐屏一致（rpx 换算、按钮统一规格、四态配色）
5. api 层签名与云函数协议一致，`USE_CLOUD=true` 时页面代码零改动即可切换（阶段③）


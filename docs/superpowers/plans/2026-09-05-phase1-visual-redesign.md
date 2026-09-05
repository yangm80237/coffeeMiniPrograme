# 咖啡豆管理小程序 · 阶段① 视觉稿定稿 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 docs/prototype.html 从通用小程序风升级为 BeanBook 插画风终稿，并新增统计页，作为阶段②小程序 WXSS 的唯一视觉依据。

**Architecture:** 单文件 HTML 原型迭代（保留现有 6 屏结构），设计 token 集中在 `:root` CSS 变量；详情页属性磁贴用纯 CSS 形状库实现；统计页为新增 screen，数据用硬编码演示值。

**Tech Stack:** 纯 HTML/CSS/原生 JS，无依赖，浏览器直接打开验证。

**Spec:** docs/设计方案.md（视觉规范/磁贴映射表/统计页设计）+ docs/需求规格书.md（状态色、页面清单）

## Global Constraints

- 状态色必须与规格书 3.3 一致：养豆中 `#FAAD14`、在喝 `#52C41A`、已喝完 `#9CA3AF`
- 衬线标题字体栈：`"Songti SC","STSong",Georgia,serif`（系统字体，不引入 webfont）
- 磁贴全部用 CSS/SVG 实现，禁止引入图片资源（风味图标此阶段用 emoji 占位）
- 手机框宽度 375px 不变；所有新样式基于 CSS 变量，禁止硬编码色值散落在业务样式里
- 数据演示值只能来自规格书已有字段（无价格字段，统计页不做"花费"指标）

---

### Task 1: 项目 git 初始化

**Files:**
- Create: `.gitignore`

**Interfaces:**
- Produces: git 仓库，后续所有任务的 commit 依赖它

- [ ] **Step 1: 初始化仓库**

```bash
cd /Users/yangming/Documents/trae_projects/coffeeApp
git init -b main
```

- [ ] **Step 2: 创建 .gitignore**

```gitignore
node_modules/
.DS_Store
miniprogram_npm/
project.private.config.json
```

- [ ] **Step 3: 首次提交（现有文档与样例）**

```bash
git add .gitignore docs/
git commit -m "docs: 需求规格书与设计方案定稿"
```

样例图片/视频体积大且仅是参考素材，暂不入库（`.gitignore` 追加一行 `样例/`）。

---

### Task 2: 设计 token 与全局样式

**Files:**
- Modify: `docs/prototype.html`（`<style>` 顶部全局区，约 8-47 行）

**Interfaces:**
- Produces: CSS 变量 `--paper/--card/--ink/--ink-soft/--accent/--status-resting/--status-drinking/--status-finished/--font-display/--radius-lg/--radius-md/--shadow-card`，后续所有任务消费

- [ ] **Step 1: 在 `<style>` 最顶部插入 token 块，并替换全局背景/字体**

```css
:root {
  --paper: #F3EDE2;        /* 暖纸底 */
  --card: #FFFDF8;         /* 卡片 */
  --ink: #26221C;          /* 主文字 */
  --ink-soft: #8A8172;     /* 次文字 */
  --accent: #C96F4A;       /* 陶土橙强调 */
  --status-resting: #FAAD14;
  --status-drinking: #52C41A;
  --status-finished: #9CA3AF;
  --radius-lg: 18px;
  --radius-md: 12px;
  --shadow-card: 0 2px 10px rgba(80,60,30,.08);
  --font-display: "Songti SC","STSong",Georgia,serif;
}
body { background: #DDD8CC; }            /* 桌面外衬 */
.screen { background: var(--paper); }
.shelf-title, .page-nav-title { font-family: var(--font-display); letter-spacing: .5px; }
```

原 `#F7F5F0`、`#1A1B1C` 等字面值仅在 token 定义处保留，业务样式一律改引变量。

- [ ] **Step 2: 浏览器验证**

打开 `docs/prototype.html`：底色变暖、货架标题呈衬线字。6 屏切换无样式崩坏。

- [ ] **Step 3: Commit**

```bash
git add docs/prototype.html && git commit -m "style: 设计token与全局暖纸底"
```

---

### Task 3: 货架页插画风卡片

**Files:**
- Modify: `docs/prototype.html`（货架区样式与 `.bean-card` 相关 HTML）

**Interfaces:**
- Consumes: Task 2 tokens
- Produces: `.bean-card` 类结构（照片区/状态胶囊/风味行），阶段② bean-card 组件照此复刻

- [ ] **Step 1: 重写卡片样式**

```css
.bean-card { background: var(--card); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card); border: 1px solid rgba(80,60,30,.06); }
.bean-photo { height: 132px; background: linear-gradient(160deg,#F1E7D2,#E5D6BB); }
.bean-brand { font-size: 10px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 1px; }
.bean-name { font-family: var(--font-display); font-size: 14px; }
.status-badge { border-radius: 999px; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.status-resting  { background: var(--status-resting); }
.status-drinking { background: var(--status-drinking); }
.status-finished { background: var(--status-finished); }
.flavor-icon { background: #FFF; border: 1px solid rgba(80,60,30,.12); }
```

- [ ] **Step 2: 浏览器验证**

货架卡片有纸感底、胶囊状态标、风味图标描边圆点；网格 2 列不破版。

- [ ] **Step 3: Commit** `git commit -m "style: 货架卡片插画风"`

---

### Task 4: 添加 / 确认页 token 适配

**Files:**
- Modify: `docs/prototype.html`（screen-add、screen-confirm 区块样式）

**Interfaces:**
- Consumes: Task 2 tokens
- Produces: `.sheet-*` 表单样式（输入框/选项卡），阶段②表单页复用

- [ ] **Step 1: 表单控件统一引 token**

```css
.screen input, .screen select, .screen textarea {
  background: var(--card); border: 1px solid rgba(80,60,30,.14);
  border-radius: var(--radius-md); color: var(--ink); font-size: 13px;
}
.primary-btn { background: var(--ink); color: #FFF; border-radius: 999px; }
.option-card.active { border-color: var(--accent); background: rgba(201,111,74,.08); }
```

- [ ] **Step 2: 浏览器验证**：添加面板、确认编辑表单控件圆角纸感统一；确认入库主按钮为墨色胶囊。

- [ ] **Step 3: Commit** `git commit -m "style: 表单页token适配"`

---

### Task 5: 详情页异形磁贴形状库（重头）

**Files:**
- Modify: `docs/prototype.html`（screen-detail 区块：样式 + 属性区 HTML 重排）

**Interfaces:**
- Consumes: Task 2 tokens
- Produces: `.tile` 体系（`.tile-shape-*` × `.tile-c-*` 色板 × 内容槽），阶段② attribute-tile 组件 1:1 复刻此配置表

- [ ] **Step 1: 磁贴通用样式与形状库**

```css
.tile-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:0 16px; }
.tile { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:4px; font-size:12px; color:#fff; text-align:center; padding:8px; }
.tile small { font-size:10px; opacity:.85; }
.tile-c1{background:linear-gradient(150deg,#F6C6B4,#EE9A8B);}  /* 烘焙日期 暖粉 */
.tile-c2{background:#EFE9DC;color:#6B655A;}                    /* 风味 米灰 */
.tile-c3{background:linear-gradient(160deg,#E8C27A,#D9A648);}  /* 克重 琥珀 */
.tile-c4{background:linear-gradient(160deg,#8FC3E8,#5E9FD4);}  /* 处理法 蓝 */
.tile-c5{background:#5D4037;}                                  /* 豆种 深棕 */
.tile-c6{background:linear-gradient(160deg,#9CCFA3,#5FA97C);}  /* 产区 绿 */
.tile-c7{background:linear-gradient(160deg,#D9E29A,#A8C05E);}  /* 海拔 黄绿 */
.tile-c8{background:linear-gradient(160deg,#E89B9B,#C96F4A);}  /* 烘焙度 */
.tile-c9{background:linear-gradient(160deg,#E8B27A,#C9834A);}  /* 冲煮 橙棕 */
.tile-c10{background:linear-gradient(160deg,#B7AECB,#8E82AB);} /* 入库 紫灰 */
/* 形状：全部由 border-radius / clip-path 实现 */
.sh-cloud  { border-radius:46% 54% 55% 45%/55% 48% 52% 45%; }
.sh-drop   { border-radius:0 50% 50% 50%; transform:rotate(45deg); }
.sh-drop>* { transform:rotate(-45deg); }
.sh-bean   { border-radius:50% / 42%; position:relative; }
.sh-bean:after { content:""; position:absolute; left:50%; top:12%; bottom:12%; width:3px;
  margin-left:-1.5px; border-radius:3px; background:rgba(255,255,255,.35); transform:rotate(18deg); }
.sh-mtn    { clip-path:polygon(50% 0,100% 78%,78% 100%,22% 100%,0 78%); }
.sh-bag    { border-radius:10px 10px 14px 14px; position:relative; }
.sh-bag:before { content:""; position:absolute; top:-7px; left:14%; right:14%; height:10px;
  border-radius:4px 4px 0 0; background:inherit; filter:brightness(.94); }
.sh-round  { border-radius:50%; }
.sh-clock  { border-radius:50%; position:relative; }
.sh-clock:after { content:""; position:absolute; left:50%; top:20%; width:3px; height:30%;
  margin-left:-1.5px; border-radius:2px; background:rgba(255,255,255,.85); transform-origin:bottom; transform:rotate(35deg); }
.sh-cup    { border-radius:10px 10px 16px 16px; position:relative; }
.sh-cup:before { content:""; position:absolute; right:-9px; top:26%; width:14px; height:14px;
  border:3px solid rgba(255,255,255,.7); border-radius:50%; }
.sh-map    { border-radius:18%; }
```

- [ ] **Step 2: 详情页属性区 HTML 按映射表重排（10 块磁贴，配置数据驱动）**

每个磁贴结构：`<div class="tile sh-* tile-cN"><b>值</b><small>标签</small></div>`，风味标签磁贴内部放胶囊组：

```html
<div class="tile sh-cloud tile-c1"><b>08.20</b><small>烘焙日期</small></div>
<div class="tile sh-drop  tile-c4"><div><b>水洗</b><small>处理法</small></div></div>
<div class="tile sh-bean  tile-c5"><b>74158</b><small>豆种</small></div>
<div class="tile sh-mtn   tile-c7"><b>2200m</b><small>海拔</small></div>
<div class="tile sh-bag   tile-c3"><b>200g</b><small>克重</small></div>
<div class="tile sh-round tile-c8"><b>浅烘</b><small>烘焙度</small></div>
<div class="tile sh-cup   tile-c9"><b>手冲</b><small>冲煮</small></div>
<div class="tile sh-clock tile-c10"><b>09.01</b><small>入库</small></div>
<div class="tile sh-map   tile-c6"><b>耶加雪菲</b><small>产区</small></div>
<div class="tile tile-c2"><b class="pill">草莓</b><b class="pill">奶油</b><small>风味</small></div>
```

风味行下方改为衬线斜体风味文字：`草莓 · 奶油 · 橙子`。

- [ ] **Step 3: 浏览器验证**

10 块磁贴 3 列网格排列，形状可辨识（水滴有尖角、豆子有中缝、山为五边形、纸袋有折角盖、时钟有时针）；sh-drop 内文字已反向水平；无溢出破版。

- [ ] **Step 4: Commit** `git commit -m "style: 详情页异形磁贴形状库"`

---

### Task 6: 统计页（新增 screen）

**Files:**
- Modify: `docs/prototype.html`（新增 `#screen-stats` + 导航 tab + 样式）

**Interfaces:**
- Produces: 统计页结构（汇总行/状态分布/点阵产区地图/四指标底栏），阶段② pages/stats 复刻

- [ ] **Step 1: 页面结构与样式**

```html
<div class="screen" id="screen-stats">
  <div class="stats-head">
    <h2>豆子统计 <span>2026</span></h2>
    <div class="stats-sum">
      <div><b>1,240</b><small>总克重 g</small></div>
      <div><b>6</b><small>在喝中</small></div>
      <div><b>11</b><small>总袋数</small></div>
    </div>
  </div>
  <div class="stats-card">
    <h3>库存状态</h3>
    <div class="dist"><i style="width:45%;background:var(--status-drinking)"></i>
      <i style="width:35%;background:var(--status-resting)"></i>
      <i style="width:20%;background:var(--status-finished)"></i></div>
    <div class="dist-legend"><span>在喝 5</span><span>养豆 4</span><span>喝完 2</span></div>
  </div>
  <div class="stats-card"><h3>处理法</h3><div class="proc-row">水洗 6 · 日晒 3 · 蜜处理 1 · 厌氧 1</div></div>
  <div class="stats-card map-card"><h3>产区地图</h3>
    <div class="dot-map">
      <i class="pin" style="left:56%;top:38%" title="耶加雪菲"></i>
      <i class="pin" style="left:60%;top:44%" title="肯尼亚"></i>
      <i class="pin" style="left:30%;top:55%" title="哥伦比亚"></i>
      <i class="pin" style="left:36%;top:64%" title="巴西"></i>
      <i class="pin" style="left:82%;top:45%" title="云南"></i>
      <i class="pin" style="left:27%;top:42%" title="危地马拉"></i>
      <i class="pin" style="left:80%;top:52%" title="巴拿马"></i>
    </div>
  </div>
  <div class="stats-foot"><div><b>4</b><small>烘焙商</small></div><div><b>11</b><small>袋</small></div>
    <div><b>7</b><small>产区</small></div><div><b>5</b><small>豆种</small></div></div>
</div>
```

```css
.stats-head { background:var(--ink); color:#fff; margin:12px 16px; border-radius:var(--radius-lg); padding:16px; }
.stats-head h2 { font-family:var(--font-display); font-size:20px; }
.stats-head h2 span { font-size:12px; opacity:.6; margin-left:6px; }
.stats-sum { display:flex; justify-content:space-between; margin-top:14px; text-align:center; }
.stats-sum b { font-size:20px; display:block; }
.stats-card { background:var(--card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card); margin:0 16px 12px; padding:14px; }
.stats-card h3 { font-size:12px; color:var(--ink-soft); font-weight:600; margin-bottom:10px; }
.dist { display:flex; height:10px; border-radius:5px; overflow:hidden; gap:2px; }
.dist-legend { display:flex; justify-content:space-between; font-size:10px; color:var(--ink-soft); margin-top:6px; }
.dot-map { position:relative; height:150px; border-radius:var(--radius-md);
  background:radial-gradient(rgba(80,60,30,.22) 1.2px, transparent 1.3px) 0 0/12px 12px; }
.pin { position:absolute; width:10px; height:10px; border-radius:50%; background:var(--accent);
  border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.25); }
.stats-foot { display:flex; justify-content:space-around; background:var(--card); border-radius:var(--radius-lg);
  margin:0 16px 90px; padding:14px 0; text-align:center; }
.stats-foot b { font-size:18px; display:block; font-family:var(--font-display); }
```

- [ ] **Step 2: 挂入导航与货架入口**

顶部 `.tab-bar` 增加「统计」按钮；`screen-shelf` 的 `.header-actions` 增加统计图标按钮（点击 `switchScreen('stats')`，沿用现有切换 JS）。

- [ ] **Step 3: 浏览器验证**

统计页：深色汇总头 → 状态分布条 → 处理法 → 点阵地图（7 个产区标注点）→ 四指标底栏；从货架图标和顶部 tab 均可进入。

- [ ] **Step 4: Commit** `git commit -m "feat: 统计页视觉稿"`

---

### Task 7: 全屏走查与定稿

**Files:**
- Modify: `docs/prototype.html`（走查发现的小修）

- [ ] **Step 1: 走查清单（逐屏）**

| 屏 | 检查点 |
|---|---|
| 货架 | 纸感底/胶囊状态标/衬线标题/悬浮添加按钮居中不遮挡卡片 |
| 添加 | 三选项卡、面板圆角、墨色主按钮 |
| 确认 | 表单控件统一、风味标签带图标占位 |
| 详情 | 顶部照片+衬线大标题、风味斜体行、10 磁贴无破版、底部操作栏 |
| 统计 | 五段式布局完整、地图点不重叠 |
| 风味/品牌 | token 生效无残留旧色 |

- [ ] **Step 2: 修复走查问题并提交**

```bash
git add docs/prototype.html && git commit -m "style: 视觉稿定稿走查修复"
```

- [ ] **Step 3: 用户确认定稿**

请用户在浏览器逐屏确认；有反馈回到对应 Task 修改。确认后阶段①完成，进入阶段②计划编写。

---

## Self-Review 记录

- 规格覆盖：设计方案第三节的 token 表（Task 2）、磁贴映射表（Task 5 全 10 项）、统计页四段式（Task 6）、风味图标占位策略（Task 3/5 保留 emoji 槽位）均有对应任务；阶段①不涉及 API/数据库，无越界。
- 占位符扫描：无 TBD/TODO；所有代码步骤均为完整可粘贴内容。
- 类型一致性：token 变量名、`.tile` 类名、`switchScreen()` 沿用现有原型 JS，命名前后一致；磁贴色板 c1-c10 与设计方案映射表一一对应。

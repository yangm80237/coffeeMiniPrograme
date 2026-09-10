# 风味分类与交互优化 · 开发文档

> 创建：2026-09-10 ｜ 状态：**待开发（方案已评审，等待开工确认）**
> 范围：AI 识别新风味的智能分类、confirm 页风味区交互重构、AI 按钮可见性、识别准确性、图标质量与分类治理
> 关联：阶段④ AI 能力收尾项；`需求规格书.md` v1.3 风味相关章节

---

## 0. 背景与目标

拍照识别已可稳定返回 `newFlavors`（库外风味），但存在两类问题：

1. **数据层**：新风味全部写入 `category: '其他'`，分类体系随使用失效；无合并/治理手段。
2. **交互层**：新风味候选区在 confirm 页顶部、已选风味区在底部，操作穿屏；「AI 提取标签」是不起眼的文字链接；图标生成无质量兜底。

目标：识别→分类→入库→生图形成一站式闭环，核心操作在一屏内完成。

---

## 1. 现状基线（改动前必读，含代码位置）

| 项 | 现状 | 位置 |
|---|---|---|
| 新风味创建分类 | 写死 `category: '其他'` | [confirm.js L239](../../../miniprogram/pages/add/confirm/confirm.js) `createCheckedNewFlavors` |
| 相似度合并 | `bestMatch` ≥ 阈值 0.6 自动并入已有风味 | `utils/similarity.js`，confirm.js L230-237 |
| 新风味候选区 | 表单**最顶部**，chips 横排，仅勾选 | confirm.wxml L35-41 `.new-flavor-box` |
| 已选风味区 | 表单**最底部**「🍓 风味」 | confirm.wxml L153-165 |
| AI 提取入口 | flavorDesc 标签旁小号文字 `✨ AI 提取标签` | confirm.wxml L169；`aiExtractFlavors` |
| 风味浮层 | 分类分组多选 sheet | confirm.wxml L197+ `.flavor-sheet` |
| 分类常量 | 七类：水果类/花香类/甜感类/坚果可可类/香料类/烘焙类/其他 | cloudfunctions/flavor/index.js L10 `CATEGORY_ORDER` |
| flavor 云函数 | list/create/update/remove；list 已支持追加用户自定义分类 | cloudfunctions/flavor/index.js |
| 自定义分类 | 后端已支持，**前端 detail 页 picker 只有七类**，无法新建 | pages/flavor/detail.js + detail.wxml L16-18 |
| 删除保护 | 被 beans 引用 → IN_USE；内置标签禁改删 | flavor/index.js L57-77 |
| 生图 | 45 个内置词有 EN 映射；自定义词直接用中文名；无质量校验 | cloudfunctions/genFlavorIcon/index.js L20-40 |
| 自动生图 | createFlavor 后 autoIcon 开关 fire-and-forget | confirm.js `triggerIconGen` L245-251 |
| 识别提示词 | flavors 为字符串数组 | cloudfunctions/recognizeBean/index.js `PROMPT` |
| 内置风味 | 149 条（Excel 合并后） | cloudfunctions/init/seed/flavors.js |

**约定**：所有引用行号为基线快照，开发时以实际代码为准，先 Read 再改。

---

## 2. 目标交互流程

```
拍照识别 recognizeBean
  │  form + newFlavors:[{ name, category, confidence, source }]
  ▼
confirm 页「🍓 风味」区（候选与已选同区）
  ├─ 相似度 ≥0.6 命中库内 → 自动并入已选（不显示为候选）
  └─ 库外候选卡（默认全选）：
       评分 ≥7  → 静默自动归类，正常样式
       评分 4-6 → 分类名琥珀高亮 + ⚠ 建议确认，可点开改
       评分 ≤3  → 默认「其他」，红色「未分类」提示
       点分类名 → 底部弹层：七分类（含各类数量）+ ＋新建分类
  ▼ 入库
批量 createFlavor(带 category) → flavorTagIds 落库
  └─ autoIcon → genFlavorIcon（质量校验，失败重试 1 次→emoji 兜底）
  ▼
风味管理页：长按标签移动/合并/重建图标；长按分类标题重命名
```

---

## 3. 数据模型与接口契约

### 3.1 recognizeBean 返回结构变更（向后兼容）

```jsonc
{
  "form": { "...": "不变" },
  "newFlavors": ["奇异果"],            // 保持字符串数组（前端兼容，不破坏现有消费方）
  "newFlavorMeta": [                    // 新增：与 newFlavors 同序
    { "name": "奇异果", "category": "水果类", "confidence": 9, "source": "model" }
  ],
  "brandCandidates": ["..."]
}
```

- 提示词 flavors schema 升级为对象数组 `{name, category, confidence}`，云函数 normalize 后拆成 `newFlavors`(字符串) + `newFlavorMeta`(信息)；
- `category` 必须 ∈ 七分类，否则置空走本地引擎；`confidence` 整数 1-10 夹取。

### 3.2 flavor 云函数新增 action：merge

```js
// 入参
{ action: 'merge', sourceId: 'xxx', targetId: 'yyy' }
// 规则
// 1. source 必须是本家庭自建标签（内置/FORBIDDEN 拒绝）；target 可为内置或本家庭
// 2. beans 中 flavorTagIds 含 sourceId 的全部替换为 targetId（用 db.command.addToSet 或读后去重写回）
// 3. 删除 source 文档
// 返回 { ok: true, migratedBeanCount }
```

错误码沿用 NO_FAMILY / NOT_FOUND / IN_USE（merge 场景不需要 IN_USE）/ FORBIDDEN。

### 3.3 create 接受任意 category 字符串（已支持）

仅需保证：空/非法值回落「其他」；trim；长度 ≤6。前端新建分类同规则。

### 3.4 genFlavorIcon 增强契约

入参新增可选 `{ names: ["玉油柑"], translate: true }`：
1. 中文名查 EN 映射表未命中且 `translate!==false` → 先调一次文本模型译为英文物品词（缓存进 flavor_tags.iconPromptEn，避免重复翻译）；
2. 抽象风味词（冷萃感/茶感/清爽等）走具象化映射 `ABSTRACT_MAP`（如 冷萃感→iced coffee glass）；
3. 出图后跑质量校验（见 §6），不合格重试 1 次（提示词追加 `simpler, bolder shapes`），仍失败：不覆盖旧图，返回 `{ok:false, reason:'QUALITY_FAIL'}`，调用方保留 emoji 占位。

---

## 4. 详细任务清单

### P0-A 智能分类引擎（纯函数先行，TDD）

**新增 `miniprogram/utils/flavorCategory.js`**

```js
// 导出
scoreCategory(name) // → { category: '水果类'|...|'其他', score: 1-10, hits: ['果'] }
mergeFlavorMeta(name, modelMeta) // 融合模型直出与本地词库：取高分；model 非法/缺失用本地
const CATEGORIES = [...] // 与云函数 CATEGORY_ORDER 一致的单一事实源（前端这份 + _shared 同步脚本）
```

- 词库从 149 个内置风味名归纳关键词（水果类词缀：莓/果/柑/橘/柠/桃/瓜/葡萄/油柑…；花香：花/茉莉/玫瑰/桂/菊…；甜感：糖/蜜/香草/奶油/太妃…；坚果可可：坚果/榛/杏仁/花生/核桃/可可/巧克力…；香料：肉桂/丁香/胡椒/八角/豆蔻/姜…；烘焙：烤/麦芽/饼干/面包/烟熏/谷物…）。
- 评分：命中分类关键词 8-10（精确物名词 10，词缀命中 8，多分类同时命中取最高并降 1 分）；无命中 3。
- 冲突词（焦糖 横跨甜感/烘焙）在词库显式指定归属（焦糖→甜感类，与种子数据分类一致）。

**测试 `tests/flavorCategory.test.js`（node:test，先写）**
- 典型词每类 ≥3 例（奇异果/油柑/柚子→水果；洋甘菊→花香；太妃糖→甜感；核桃→坚果可可；八角→香料；烤面包→烘焙）
- 冲突词（焦糖）、无命中（冷萃感→3分/其他）、空串、英文/中英混合、confidence 夹取与融合规则。

### P0-B recognizeBean 结构化 flavors + 提示词升级

文件：`cloudfunctions/recognizeBean/index.js`
1. PROMPT 修改点：
   - flavors schema 改为 `[{"name":"奇异果","category":"水果类","confidence":9}]`，逐字段说明（category 只能七分类之一、confidence=把握度 1-10）；
   - 内嵌 149 风味词表按七分类列出（约 600 字，引导用词表内词）；
   - few-shot：加 2 个范例（① 水洗豆袋常规词；② 含长尾词"玉油柑/冷萃感"的豆袋），示例只放 user/assistant 的 JSON 片段；
2. normalize：兼容**字符串数组与对象数组**两种形态（旧模型/DeepSeek 输出不稳定时不崩）；输出 newFlavors + newFlavorMeta；
3. 品牌/其他逻辑不动。

**测试**：recognizeBean 的纯函数部分（normalizeFlavors 若可导出）补单测；本地脚本用 `样例/测试豆袋/咖啡会有-1.JPG`、`咖啡会有-2.JPG`、`YELEI-1.jpg`、`YELEI-2.jpg` 四张回归，对比前后字段命中率。

### P0-C confirm 页候选区下移 + 分类弹层

文件：pages/add/confirm/confirm.{wxml,wxss,js}
1. 删除顶部 `.new-flavor-box`（wxml L35-41）；
2. 🍓 风味区内、已选标签下方插入候选区：
   - 每候选一行：勾选框 + 名称 +（新）角标 + 右侧分类按钮（显示 `水果类 9分`，按分数段着色：≥7 常规 / 4-6 琥珀 / ≤3 红）；
   - 候选区标题：`✨ AI 新发现风味（n）`；
   - 底部小按钮 `＋ 新建分类`；
3. 分类选择底部弹层（复用 `.picker-mask`/sheet 视觉）：七分类单选（显示该分类当前标签数）+ 自定义分类（本家庭已建的）+ 新建输入框；选中只改本候选的 category；
4. data 结构：`newFlavorCands: [{ name, checked:true, category, score, source }]`；
   - 消费 ai 结果时合并 `newFlavorMeta`：`mergeFlavorMeta(name, meta)` 得 category/score；
5. `createCheckedNewFlavors`：`createFlavor({ name, category: cand.category })` 替代写死「其他」；其余流程（相似度合并、resolved/created、triggerIconGen）不变。

### P1-D 「从描述提取标签」按钮化 + 状态机

1. wxml：文字链接改为 textarea 下方整宽描边按钮；
2. data：`extractState: 'idle'|'busy'|'success'|'error'`，按钮文案/样式四态（busy 禁用防重，success 显示 `✓ 已提取 n 个` 2 秒后回 idle，error 显示 `⚠� 提取失败，点按重试`）；
3. 现有 aiExtractFlavors 为 mock 遗留本地逻辑——评估改为云调用 recognizeBean 的轻量"文本提取"模式（新增 event.mode='textDesc'，只发 flavorDesc 文本不出图）；若成本不值则保留本地实现但补错误态。**开工时二选一，默认做云端模式**。

### P1-E 图标质量校验 + 中文词 fallback

文件：cloudfunctions/genFlavorIcon/index.js
1. 抠图后、上传前增加 `assessIcon(imageJimp)`：
   - 辨识度：不透明像素占比 ∈[15%,70%]；alpha 质心距图心 <15% 边长；
   - 美观度：平均 HSV 饱和度 >40；量化后去灰主色数 3-8；
   - 返回 `{pass, reasons[]}`；
2. 不合格 → 用追加提示词重生 1 次 → 仍失败不写 iconUrl，返回 QUALITY_FAIL；
3. 中文词翻译 fallback（§3.4）；抽象词 ABSTRACT_MAP（冷萃感/茶感/清爽/发酵感 等，初始 8-10 条）；
4. 风味详情页对 iconUrl 为空的自建标签显示「图标生成失败/未生成，点按重试」（detail 页 regenIcon 已存在，补空态入口）。

**测试**：assessIcon 纯函数用 3 张合成图（全透明、纯白底、正常彩色块）验证 pass/fail；node:test。

### P2-F 风味管理页分类治理

1. pages/flavor/list：标签项**长按**弹 ActionSheet：移动分类 / 合并到… / 重新生成图标 / 删除；
2. 「移动分类」复用 P0-C 分类弹层组件（建议抽成 component：`components/category-picker/`，confirm 与 list 共用）；
3. 「合并到…」：弹风味搜索选择器 → 二次确认（提示 N 袋豆子将改挂目标标签）→ `flavorApi.mergeFlavor(sourceId, targetId)`；
4. 分类标题长按：重命名（批量 update 该分类下本家庭标签；内置分类名禁改）；删除分类入口先引导移动/合并（空分类直接移除=标签批量改挂其他）；
5. api/flavor.js 增加 `mergeFlavor`（云 + mock 双实现）；mock 同步实现豆子引用替换，保证 USE_CLOUD=false 的 21+ 项契约测试。

### P2-G 管理与稳定性

1. 管理页「测试连接」做实：admin 或 recognizeBean 新增 `ping` action（文本单轮 "ping"，返回 provider/model/延迟 ms）；管理页显示结果；
2. processing 页：识别失败重试累计 2 次仍失败 → modal 主动建议「转手动填写」（现有红卡保留）；
3. recognizeBean 低置信补识别（可选，时间盒）：brand 空或 flavors 置信度普遍 <5 时，用主图补发一次"只填缺失字段"请求，失败静默。

---

## 5. 界面布局示意（confirm 页 🍓 风味区）

```
🍓 风味
─────────────────────────────────────
风味标签
[🍓草莓 ×] [🌸茉莉 ×] [✨奇异果(新) ×]
[＋ 添加标签]

✨ AI 新发现风味（3）
┌───────────────────────────────────┐
│ ☑ 奇异果          〔水果类 · 9分〕 │
│ ☑ 玉油柑      〔水果类 · 6分 ⚠〕  │ ← 琥珀底
│ ☐ 冷萃感       〔其他 · 3分 ⚠〕   │ ← 红字
 │            ＋ 新建分类             │
└───────────────────────────────────┘

烘焙商风味描述
[ textarea ........................ ]
[  ✨ 从风味描述提取标签  ]           ← 整宽描边按钮（四态）
```

分类弹层：
```
        ────（handle）
      选择分类
  ● 水果类（68）
  ○ 花香类（16）
  ○ 甜感类（10）
  ……
  ○ 其他（3）
  ── 我的分类 ──
  ○ 茶饮类（8）
  [＋ 输入新分类名          ][添加]
```

视觉规范沿用 BeanBook：暖纸底、衬线分区标题、陶土橙主色；琥珀 `#B7791F` 底 `#FBF3E2`；危险红沿用 `#E5484D`。

---

## 6. 图标质量评估标准（自动判定口径）

| 维度 | 指标 | 阈值 |
|---|---|---|
| 辨识度 | 不透明像素占比 | 15%–70% |
| 辨识度 | 主体质心偏离图心 | <15% 边长 |
| 美观度 | 平均饱和度（HSV-S） | >40/100 |
| 美观度 | 去灰后主色数量化色数 | 3–8 |
| 一致性 | 画布 1024×1024、透明底、无描边 | 管线固定保证 |
| 一致性 | 无文字 | 提示词约束（不做 OCR） |

失败处理：重生 1 次（`simpler, bolder shapes`）→ 仍失败保留旧图/emoji 占位 + 可手动重试。

---

## 7. 识别准确性改进措施（本计划落地项）

1. flavors 结构化输出（name/category/confidence）——P0-B；
2. few-shot 两例（常规 + 长尾词）——P0-B；
3. 149 风味词表按分类内嵌提示词——P0-B；
4. 多图合并 + 压缩图识别（已完成，2026-09-09）；
5. 低置信字段二次补识别——P2-G（可选）；
6. 回归基线：四张测试袋图固定对比命中率，改动提示词后必跑。

---

## 8. 文件变更清单

| 文件 | 变更 | 批次 |
|---|---|---|
| miniprogram/utils/flavorCategory.js | 新增：分类打分纯函数 | P0 |
| miniprogram/tests/flavorCategory.test.js | 新增：单测 | P0 |
| miniprogram/cloudfunctions/recognizeBean/index.js | 提示词 v4、normalize flavors 兼容、newFlavorMeta | P0 |
| miniprogram/pages/add/confirm/confirm.{js,wxml,wxss} | 候选区下移、分类弹层、按分类创建、提取按钮状态机 | P0/P1 |
| miniprogram/components/category-picker/* | 新增：分类选择组件（confirm + flavor list 复用） | P0/P2 |
| miniprogram/cloudfunctions/genFlavorIcon/index.js | 质量校验、翻译 fallback、抽象词映射 | P1 |
| miniprogram/tests/ 下图标质量测试 | assessIcon 单测 | P1 |
| miniprogram/pages/flavor/list.{js,wxml,wxss} | 长按操作、分类治理入口 | P2 |
| miniprogram/pages/flavor/detail.{js,wxml} | 自定义分类可选、图标空态重试 | P1/P2 |
| miniprogram/api/flavor.js | mergeFlavor（云+mock） | P2 |
| miniprogram/cloudfunctions/flavor/index.js | merge action | P2 |
| miniprogram/mock/flavor.js | merge mock + 自定义分类 | P2 |
| miniprogram/pages/admin/* | 测试连接做实 | P2 |
| miniprogram/pages/add/processing/processing.js | 重试 2 次建议手动 | P2 |
| cloudfunctions/_shared + sync-shared.sh | CATEGORIES 常量如需跨函数共享则同步 | P0 |

---

## 9. 验收标准

**P0**
- [ ] 拍含库外风味的袋子，候选出现在 🍓 风味区内，默认勾选；分类 ≥7 自动显示、4-6 琥珀、≤3 红色；
- [ ] 可就地改分类、可新建分类；入库后 flavor_tags 中文档 category 正确，不再全进「其他」；
- [ ] 相似度 ≥0.6 仍正确并入已有风味（回归不破坏）；
- [ ] flavorCategory 单测全绿，全量 node:test 全绿（当前基线 44 项，只增不减）；
- [ ] 四张测试图回归：风味字段命中率不低于改造前。

**P1**
- [ ] 提取按钮四态可见可点；busy 防重；
- [ ] 故意触发生图失败时 emoji 兜底、不写坏图、可手动重试；
- [ ] 中文词/抽象词各 1 例生图成功且通过质量校验。

**P2**
- [ ] 自建标签可移动分类、可合并（豆子引用正确迁移、源标签删除）；
- [ ] 内置标签受保护不可改删/被合并源；
- [ ] 管理页测试连接显示 provider/model/延迟；
- [ ] USE_CLOUD=false mock 契约测试全绿。

## 10. 风险与注意

- **同文件串行编辑**（历史教训：并行改同一文件互相覆盖过两次）——confirm.* 各任务串行。
- **云函数部署**：recognizeBean / flavor / genFlavorIcon 改动均需重新部署；改提示词后先本地脚本回归再真机。
- **149 词表进提示词**会增加输入 token（约 600 字 ≈ 可接受），留意 DeepSeek 单图 384 输出 token 限制对 flavors 对象数组的影响，必要时 confidence 用个位数字压缩。
- **merge 不可逆**：执行前必须二次确认；先只做单条合并，不做批量。
- **内置风味分类**不可被本计划改动；分类治理只作用 familyId 本家庭标签。
- 报告声明须与落盘代码核对（历史教训：出现过"声明完成但代码缺失"），接线类改动逐个 grep 调用点复审。

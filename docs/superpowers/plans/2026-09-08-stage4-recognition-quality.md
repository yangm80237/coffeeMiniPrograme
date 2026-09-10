# 阶段④识别质量迭代 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development，逐任务执行。基于用户真机实测反馈的系统性优化。

**Goal:** 识别准确率与赋值成功率的系统性提升：结构化识别提示词（咖啡领域知识+翻译规则）、输出清洗归一、新风味勾选创建流程（含 AI 图标，管理页开关控制）、品牌全量重初始化（AI 补全资料、logo 留空手传）。

**已定决策：** logo=留空手传（AI 不生成）；品牌清理=全清重建（含用户自建，老豆子品牌关联变空为已知代价）；新风味=确认页勾选后才建档；管理页新增「新风味自动生图」开关（config.autoIcon，默认开）。

**Spec:** docs/需求规格书.md v1.3 · 现有契约 miniprogram/api/*.js 与 cloudfunctions/*。

## Global Constraints

- 页面代码改动仅限：confirm.js/wxml（新风味候选区）、admin 页（开关+重初始化区）、api/admin.js
- 云函数：recognizeBean 重构（提示词+清洗）、admin 扩展（reinitBrands）、genFlavorIcon 支持自定义风味
- 密钥只在环境变量；ai_logs 成败都记；错误信息带响应体片段
- 每 Task commit；node --check + 21 项测试不回归

---

### Task 1: recognizeBean 重构——结构化提示词 + 清洗模块

**Files:** Modify `miniprogram/cloudfunctions/recognizeBean/index.js`

**要点：**
- PROMPT v2 分层结构（中文，适配 lite 模型）：①任务定义 ②咖啡领域知识库 ③翻译规则 ④输出 JSON schema ⑤质量标准
- 知识库内嵌：烘焙度五档判定（浅烘=一爆密集前后/ Agtron 适合描述「浅」…用感官描述词）、处理法标准词表（水洗/日晒/蜜处理/厌氧日晒/湿剥法）、常见产地国中英对照（埃塞俄比亚/肯尼亚/巴拿马/哥伦比亚/危地马拉/巴西/印尼/卢旺达/洪都拉斯/哥斯达黎加/也门/中国/美国/日本/德国/丹麦/挪威/韩国）、常见豆种表（瑰夏/铁皮卡/波旁/SL28/74158/卡杜拉/卡帝姆）、风味轮常见词（柑橘/莓果/热带水果/花香/焦糖/巧克力/坚果/香料/发酵/茶感…）
- 翻译规则（写进提示词）：brand 与 name **保留原文**（拉丁/日韩字母不译）；country/origin → 中文标准名；process → 词表标准词；variety → 有对应中文用词表，无则保留原文；flavorDesc → 中文
- 新增输出字段 `"flavors": ["风味1","风味2"]`（从风味描述拆分的结构化数组，每项为独立风味词）
- 清洗模块 `normalize(extracted, 词典)`（云函数内纯函数，可独立导出供测试）：
  - 通用：trim、去包裹引号、去「产地：」「国家:」等前缀、压缩连续空格
  - country：英→中映射表 + 容错（含"埃塞"→埃塞俄比亚 等前缀匹配）
  - process：同义词映射（washed→水洗, natural/sun dried→日晒, honey→蜜处理, anaerobic→厌氧日晒, wet hulled/semi-washed→湿剥法…）
  - variety：小写化后对照表（geisha→瑰夏, typica→铁皮卡, bourbon→波旁, sl28→SL28, caturra→卡杜拉, catimor→卡帝姆, 74158 原样）
  - roastLevel/weight/roastDate：保留现有归一逻辑
  - flavors：数组每项 trim、去空、去重、单项 ≤12 字
- 新增返回字段：`{ form, newFlavors }`——newFlavors = flavors 中无法被 flavor_tags（内置∪本家庭）name 精确匹配的项
- writeLog 用实际 model（修 'unknown'）

- [ ] Step 1: 重写 PROMPT 常量（分层注释清晰）
- [ ] Step 2: 实现 normalize + 词典常量
- [ ] Step 3: 接线 form 装配与 newFlavors 计算；writeLog 修 model
- [ ] Step 4: node --check；commit `feat(④): 识别提示词结构化+领域词表+翻译规则+输出清洗`

### Task 2: 新风味勾选创建 + 管理页开关 + genFlavorIcon 支持自定义风味

**Files:** Modify `miniprogram/pages/add/confirm/{confirm.js,confirm.wxml,confirm.wxss}`、`miniprogram/pages/admin/*`、`miniprogram/api/admin.js`、`miniprogram/cloudfunctions/genFlavorIcon/index.js`、`miniprogram/cloudfunctions/admin/index.js`

**要点：**
- confirm：mode=ai 且接口返回 newFlavors 非空 → 表单上方渲染「发现库外新风味」候选区（checkbox 默认全选 + 分类固定「其他」）；onSubmit 对勾选项逐个 `flavorApi.createFlavor({name, category:'其他'})` → 用返回的 tagIds 替换 form.flavorTagIds 中对应占位 → 若 config.autoIcon（读取：admin getConfig 已有？新增 autoIcon 字段读取走 `api/admin.getModelConfig` 扩展或直接 call('admin',{action:'getConfig'})）→ fire-and-forget 调 `call('genFlavorIcon',{names:[name]})` 不阻塞入库
- genFlavorIcon：更新目标从 `where({name,isBuiltin:true})` 改为「按 name 查首个文档 → 按 _id 更新」（内置与自定义风味通吃）；断点续跑只针对内置（自定义风味始终由确认流程触发）
- admin 云函数 getConfig 返回体增加 `autoIcon`（缺省 true）；新增 action `reinitBrands`
- admin 页：新增「⚙️ 新风味自动生图」开关（读写 config.autoIcon）
- api/admin.js：getConfig 透传新字段

- [ ] Step 1: confirm 候选区 UI + 勾选提交链路
- [ ] Step 2: genFlavorIcon 支持自定义风味
- [ ] Step 3: config.autoIcon 全链路（云函数返回/管理页开关/confirm 读取）
- [ ] Step 4: node --check + 测试回归；commit `feat(④): 新风味勾选创建+自动生图开关+genFlavorIcon支持自定义风味`

### Task 3: 品牌全量重初始化

**Files:** Modify `miniprogram/cloudfunctions/admin/index.js`、`miniprogram/pages/admin/*`、`miniprogram/api/admin.js`

**要点：**
- admin 云函数新增 action `reinitBrands { lines: ["名字,国家", ...] }`：
  - 解析行（支持中英文逗号）；首调时**清空 brands 全部文档**（含内置与用户自建，用户已确认）——用标志位防重复清空：集合空则跳过清空步骤
  - 逐品牌：文案 LLM（视觉模型纯文本对话）生成 `{description(一句话简介), founded(成立年份,不确定给''), traits(产品特点)}`，prompt 声明「资料用于咖啡品牌库展示，不确定的年份留空，禁止编造获奖记录」
  - logo 留空字符串（用户手传）
  - 插入 `{name, nameEn:'', logo:'', country, flag(getFlag), description, founded, traits, isBuiltin:true}`
  - 断点续跑：处理过的 name 存内存即可（函数实例保温期间有效），返回 `{processed, remaining, nextLine}`——前端重复调用直到 remaining=0
- api/admin.js：`reinitBrands(lines)` 透传
- admin 页：新增「品牌库重初始化」卡片——textarea（每行 `品牌名,国家`）+「开始重建」按钮（含红色确认：将清空现有全部品牌）+ 进度显示（已处理/剩余）+「继续」按钮
- 注意：beans.brandId 悬空为已知代价（用户确认）；bean.js decorate 对查不到的品牌已容错

- [ ] Step 1: 云函数 reinitBrands（解析/清空/LLM文案/断点续跑）
- [ ] Step 2: admin 页重初始化卡片 + api 透传
- [ ] Step 3: node --check + 测试回归；commit `feat(④): 品牌全量重初始化(AI补资料/logo手传/断点续跑)`

---

## 验收标准

1. 真机识别：同一豆袋重复拍 2 次，country/process/roastLevel 稳定输出标准词；brand/name 保留原文；风味列表结构化返回
2. 库外风味：确认页出现候选区 → 勾选入库 → 风味库出现新标签（其他类）→ 开关开时图标异步生成替换 emoji
3. 品牌重初始化：粘贴清单 → 全部重建 → 品牌库可见资料与国旗 → 老豆子品牌字段容错显示
4. 管理页开关生效（关掉后新风味不再触发生图）
5. 21 项测试不回归

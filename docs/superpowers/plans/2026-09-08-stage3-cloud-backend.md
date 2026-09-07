# 阶段③ 数据真实接入 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development，逐任务执行并勾选。

**Goal:** 把 api 层的 mock 实现切到微信云开发（环境 `cloud1-d5gs9s49ib2d67be3`）：7 个云函数 + 6 个集合 + 照片上云存储，页面代码零改动，两人真实数据共享。

**Architecture:** 云函数按 api 模块同名拆分（user/bean/brand/flavor/stats/admin + init 种子），协议 `{action, ...payload}` 与 `api/cloud.js` 的 call() 完全一致。云函数内：`getWXContext().OPENID` 鉴权 → users 表查 familyId → 按 familyId 读写业务集合。视图装饰（statusInfo/statusText/flag/flavors）搬到服务端。utils（status/format/flags）复制进各函数目录（云函数独立部署不能外部 require）。

**Tech Stack:** wx-server-sdk（云端安装）、微信云数据库 6 集合、云存储。

**Spec:** docs/需求规格书.md v1.3 · docs/设计方案.md（第六/七节） · api 层签名=契约（miniprogram/api/*.js）。

## Global Constraints

- 页面代码零改动（唯一例外：confirm 入库前加照片上传，走 api 层新函数）
- 业务集合全部带 familyId；brands/flavor_tags 的内置数据 familyId 为 null（全局可读），用户自建带 familyId
- 云函数端绕过数据库权限，**鉴权只在云函数内做**：无家庭身份拒绝业务读写（NO_FAMILY）
- 状态计算必须在服务端（computeStatus/statusBarText，禁止前端传 status）
- Key/Secret 不进代码；本阶段不接 AI（recognizeBean/genFlavorIcon 属阶段④）
- USE_CLOUD 最终置 true，但部署完成前保持 false（见 Task 5 顺序）
- 提交规范：每 Task 一个 commit

---

### Task 1: 云函数基座（env/project 配置 + user + init + admin）

**Files:**
- Modify: `miniprogram/config/env.js`（填 CLOUD_ENV_ID，USE_CLOUD 本任务保持 false）
- Modify: `miniprogram/project.config.json`（加 `"cloudfunctionRoot": "cloudfunctions/"`）
- Create: `cloudfunctions/user/{index.js,package.json}`、`cloudfunctions/admin/*`、`cloudfunctions/init/*`
- Create: `cloudfunctions/_shared/{status.js,format.js,flags.js}`（从 miniprogram/utils 与 api/flags 复制，各函数部署前由脚本同步进各自目录）

**Interfaces:**
- user: `bootstrap`→{user|null, family|null}；`createFamily`→family(生成6位码,建families+users文档,role owner)；`joinFamily(code)`→family(BAD_CODE/FULL)；`updateProfile({nickname,avatarUrl})`；`setInviteEnabled(bool)`；`regenerateInvite`
- admin: `getModelConfig`→{modelVision,modelImage,source}（config 集合 `_id:'ark'`，无则回退环境变量 ARK_MODEL_VISION/ARK_MODEL_IMAGE 并标 source:'fallback'）；`updateModelConfig(patch)` 仅 owner（FORBIDDEN）
- init: 幂等种子——brands 12 个（isBuiltin:true,familyId:null，与 miniprogram/mock/brands.js 同数据）、flavor_tags 45 个（同 mock/flavors.js）、config 无则建默认 ark 文档；重复运行不重复插入（按 name+isBuiltin 查重）
- 数据结构：users{_openid,nickname,avatarUrl,familyId,role,createdAt}；families{_id,inviteCode,inviteEnabled,createdAt}

- [ ] Step 1: env.js 填环境 ID；project.config.json 加 cloudfunctionRoot
- [ ] Step 2: _shared 工具复制 + 同步脚本 `cloudfunctions/sync-shared.sh`（cp 到 user/bean/brand/flavor/stats/admin/init/utils/）
- [ ] Step 3: user/admin/init 三函数实现（wx-server-sdk，collection: users/families/config/brands/flavor_tags）
- [ ] Step 4: node --check 全部 index.js；commit `feat(③): 云函数基座——user鉴权/init种子/admin模型配置`

### Task 2: 业务云函数（bean / brand / flavor / stats）

**Files:** Create: `cloudfunctions/bean/*`、`cloudfunctions/brand/*`、`cloudfunctions/flavor/*`、`cloudfunctions/stats/*`

**Interfaces:**
- bean: list(status,keyword)/get(id)/create(data)/update(id,patch)/remove(id)/setBeanStatus(id,status)
  - list：查 familyId=我的家庭 → 服务端 decorate（computeStatus/statusBarText/getFlag/flavors 联表）→ 筛选(在喝不含hurry)+排序(drinking>resting>hurry>finished,同级烘焙日期新在前)+keyword 过滤
  - create：补 familyId/_openid/isNew:true/myRating:null/wifeRating:null/inDate；update 白名单字段（name,country,origin,variety,process,altitude,weight,roastLevel,brewMethod,roastDate,flavorTagIds,flavorDesc,photos,statusOverride）
  - statusOverride 用 null 约定（'auto'→null，云函数端 remove 字段用 update `statusOverride: _.remove()`）
- brand: list(countries)（内置 familyId:null ∪ 本家庭自建，带 beanCount）/get(id)→{brand,beans,avgScore}/create(data)
- flavor: list→[{category,items}]（内置∪本家庭）/create/update/remove(removeFlavor 查 beans.flavorTagIds 引用→IN_USE reject)
- stats: get→aggregate(beans)（totalWeight 排除 finished/statusDist/processDist/countryDist(flag)/varietyDist——口径与 miniprogram/api/stats.js aggregate 一致）
- photos 存储 fileID 数组（Task 3 产生），getBean 原样返回

- [ ] Step 1: 四函数实现（bean 的 decorate 与排序是重点）
- [ ] Step 2: node --check；commit `feat(③): bean/brand/flavor/stats 云函数(家庭隔离+服务端装饰)`

### Task 3: 照片上云存储 + api 层接线

**Files:**
- Create: `miniprogram/api/upload.js`（`uploadImages(tempPaths) -> [fileID]`：wx.cloud.uploadFile 到 `beans/${Date.now()}-${i}.jpg`，USE_CLOUD=false 时原样返回）
- Modify: `miniprogram/pages/add/confirm/confirm.js`（onSubmit 入库前：USE_CLOUD 且 photos 非空 → 先 uploadImages 替换 photos；编辑形态不改照片）
- Modify: `miniprogram/config/env.js`（USE_CLOUD: true —— 最后一步）

- [ ] Step 1: upload.js + confirm.js 接线（mock 模式行为不变，测试 21 项全绿）
- [ ] Step 2: env.js 切 USE_CLOUD:true；commit `feat(③): 照片上云存储+数据源切云开发`

### Task 4: 静态核验 + 部署与验证指引

**Files:**
- Modify: `docs/设计方案.md`（阶段③状态核销）

- [ ] Step 1: 核验——云函数协议与 api 层调用点逐一对照（8 模块 × action）；node --check 全部；测试 21 项全绿（mock 分支不回归）
- [ ] Step 2: 产出部署指引（写入 docs/设计方案.md 阶段③小节）：①DevTools 云开发控制台建 6 集合（families/users/brands/beans/flavor_tags/config，权限默认）②cloudfunctions 下 7 个函数逐个右键「上传并部署：云端安装依赖」③DevTools 云函数测试面板运行 init 一次 ④编译真机走查
- [ ] Step 3: commit `docs(③): 阶段③核销与部署指引`

## 验收标准

1. 用户部署后真机走查：首启绑定→创建家庭→真入库（照片进云存储）→ 太太输码加入→两人互见同一份库存→状态/评分/编辑互通→管理页配置可读写 config
2. mock 分支测试 21 项全绿（页面逻辑无回归）
3. USE_CLOUD=true 时页面代码与阶段②完全一致（仅 confirm 增加上传调用）

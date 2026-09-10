// recognizeBean 内置：视觉识别服务商解析（火山方舟 volc / DeepSeek deepseek）
// 纯函数（不依赖 wx-server-sdk），供 tests/visionConfig.test.js 覆盖
// 优先级：config.ark.visionProvider → 缺省 'volc'（向后兼容，无配置时维持火山）
// endpoint/key/model：config 集合优先 → 环境变量 → 内置默认
// DeepSeek：视觉模型 deepseek-v4-flash-vision-exp（2026-08 上线，OpenAI 兼容，支持 base64 内联传图）

const VOLC_DEFAULT_MODEL = 'doubao-seed-2-0-lite-260428';
const DS_DEFAULT_MODEL = 'deepseek-v4-flash-vision-exp';

// 模型名与服务商错配检测（防 404）：volc 收到 deepseek-* 模型名 / deepseek 收到 doubao-*/ep-* → 视为错配
function isModelMismatch(provider, model) {
  const m = String(model || '');
  if (!m) return false;
  if (provider === 'deepseek') return /^(doubao-|ep-)/.test(m);
  return m.startsWith('deepseek-');
}

function resolveVisionConfig(cfg, env) {
  const e = env || process.env;
  const provider = (cfg && cfg.visionProvider) === 'deepseek' ? 'deepseek' : 'volc';
  if (provider === 'deepseek') {
    let model = (cfg && cfg.modelVision) || e.DEEPSEEK_MODEL_VISION || DS_DEFAULT_MODEL;
    if (isModelMismatch('deepseek', model)) model = DS_DEFAULT_MODEL;
    return {
      provider,
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      key: e.DEEPSEEK_API_KEY || '',
      model,
    };
  }
  let model = (cfg && cfg.modelVision) || e.ARK_MODEL_VISION || VOLC_DEFAULT_MODEL;
  if (isModelMismatch('volc', model)) model = VOLC_DEFAULT_MODEL;
  return {
    provider: 'volc',
    hostname: 'ark.cn-beijing.volces.com',
    path: '/api/v3/chat/completions',
    key: e.ARK_API_KEY || '',
    model,
  };
}

module.exports = { resolveVisionConfig, isModelMismatch, VOLC_DEFAULT_MODEL, DS_DEFAULT_MODEL };

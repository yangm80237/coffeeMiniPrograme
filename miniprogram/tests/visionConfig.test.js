const test = require('node:test');
const assert = require('node:assert');
const { resolveVisionConfig, isModelMismatch, VOLC_DEFAULT_MODEL, DS_DEFAULT_MODEL } = require('../cloudfunctions/recognizeBean/utils/visionConfig');

test('缺省 provider = volc（向后兼容，无 config 也走火山）', () => {
  const vc = resolveVisionConfig(null, { ARK_API_KEY: 'k-ark' });
  assert.equal(vc.provider, 'volc');
  assert.equal(vc.hostname, 'ark.cn-beijing.volces.com');
  assert.equal(vc.path, '/api/v3/chat/completions');
  assert.equal(vc.key, 'k-ark');
  assert.equal(vc.model, VOLC_DEFAULT_MODEL);
});

test('volc：config.modelVision 优先于环境变量/默认', () => {
  const vc = resolveVisionConfig({ visionProvider: 'volc', modelVision: 'ep-x' }, { ARK_MODEL_VISION: 'env-model' });
  assert.equal(vc.model, 'ep-x');
  const vc2 = resolveVisionConfig({}, { ARK_MODEL_VISION: 'env-model' });
  assert.equal(vc2.model, 'env-model');
});

test('deepseek：切换 endpoint/key/model', () => {
  const vc = resolveVisionConfig({ visionProvider: 'deepseek' }, { DEEPSEEK_API_KEY: 'k-ds' });
  assert.equal(vc.provider, 'deepseek');
  assert.equal(vc.hostname, 'api.deepseek.com');
  assert.equal(vc.path, '/chat/completions');
  assert.equal(vc.key, 'k-ds');
  assert.equal(vc.model, DS_DEFAULT_MODEL);
});

test('deepseek：key 缺失返回空串（main 据此抛 NO_DS_KEY）', () => {
  const vc = resolveVisionConfig({ visionProvider: 'deepseek' }, {});
  assert.equal(vc.key, '');
});

test('deepseek：modelVision 与 DEEPSEEK_MODEL_VISION 优先级', () => {
  assert.equal(resolveVisionConfig({ visionProvider: 'deepseek', modelVision: 'm1' }, { DEEPSEEK_MODEL_VISION: 'm2' }).model, 'm1');
  assert.equal(resolveVisionConfig({ visionProvider: 'deepseek' }, { DEEPSEEK_MODEL_VISION: 'm2' }).model, 'm2');
});

test('volc 不受 deepseek 环境变量影响；非法 provider 归 volc', () => {
  const vc = resolveVisionConfig({ visionProvider: 'unknown' }, { ARK_API_KEY: 'k' });
  assert.equal(vc.provider, 'volc');
  assert.equal(vc.key, 'k');
});

test('错配兜底：volc + deepseek-* 模型名 → 回退火山默认（防 ARK_404）', () => {
  const vc = resolveVisionConfig({ modelVision: 'deepseek-v4-flash-vision-exp' }, { ARK_API_KEY: 'k' });
  assert.equal(vc.provider, 'volc');
  assert.equal(vc.model, VOLC_DEFAULT_MODEL);
});

test('错配兜底：deepseek + doubao-*/ep-* 模型名 → 回退 DeepSeek 默认', () => {
  const vc = resolveVisionConfig({ visionProvider: 'deepseek', modelVision: 'doubao-seed-2-0-lite-260428' }, { DEEPSEEK_API_KEY: 'k' });
  assert.equal(vc.provider, 'deepseek');
  assert.equal(vc.model, DS_DEFAULT_MODEL);
  assert.equal(resolveVisionConfig({ visionProvider: 'deepseek', modelVision: 'ep-vision-xxx' }, { DEEPSEEK_API_KEY: 'k' }).model, DS_DEFAULT_MODEL);
});

test('isModelMismatch 判定', () => {
  assert.equal(isModelMismatch('volc', 'deepseek-v4-flash-vision-exp'), true);
  assert.equal(isModelMismatch('volc', 'doubao-x'), false);
  assert.equal(isModelMismatch('volc', 'ep-x'), false);
  assert.equal(isModelMismatch('deepseek', 'doubao-x'), true);
  assert.equal(isModelMismatch('deepseek', 'ep-x'), true);
  assert.equal(isModelMismatch('deepseek', 'deepseek-v4-flash-vision-exp'), false);
  assert.equal(isModelMismatch('deepseek', ''), false);
});

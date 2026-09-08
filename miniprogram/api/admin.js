// api/admin.js —— 模型 ID 维护，仅 owner 可写（规格书 3.9）；非 owner reject FORBIDDEN
const { enabled, call } = require('./cloud');
const F = require('../mock/family');

let CONFIG = { modelVision: 'ep-vision-default', modelImage: 'ep-image-default', autoIcon: true, source: 'env' };

function isOwner(openid) { return openid === F.MOCK_SELF_OPENID; } // mock：本人即 owner

function getModelConfig() {
  if (enabled()) return call('admin', { action: 'getConfig' });
  return Promise.resolve({ ...CONFIG });
}
function updateModelConfig(patch) {
  if (enabled()) return call('admin', { action: 'updateConfig', patch });
  if (!isOwner(F.MOCK_SELF_OPENID)) return Promise.reject(new Error('FORBIDDEN'));
  CONFIG = { ...CONFIG, ...patch, source: 'admin' };
  return Promise.resolve({ ...CONFIG });
}
// 品牌全量重初始化（仅云开发模式；mock 分支无对应实现）
function reinitBrands(lines) {
  if (enabled()) return call('admin', { action: 'reinitBrands', lines });
  return Promise.reject(new Error('仅云开发模式可用'));
}
module.exports = { getModelConfig, updateModelConfig, reinitBrands, isOwner };

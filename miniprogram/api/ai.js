// AI 能力入口：识别（USE_CLOUD=false 时走 mock 延时返回 null）
const env = require('../config/env');
const { call } = require('./cloud');
// fileIDs：识别用图片数组（已压缩），多张合并识别（正/背面信息互补）
function recognizeBean(fileIDs) {
  if (!env.USE_CLOUD) return new Promise((r) => setTimeout(() => r(null), 3000));
  return call('recognizeBean', { fileIDs: Array.isArray(fileIDs) ? fileIDs : [fileIDs] })
    .then((r) => (r && r.form) ? r : null);
}
module.exports = { recognizeBean };

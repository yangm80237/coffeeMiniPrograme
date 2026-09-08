// AI 能力入口：识别（USE_CLOUD=false 时走 mock 延时返回 null）
const env = require('../config/env');
const { call } = require('./cloud');
function recognizeBean(fileID) {
  if (!env.USE_CLOUD) return new Promise((r) => setTimeout(() => r(null), 3000));
  return call('recognizeBean', { fileID }).then((r) => (r && r.form) ? r : null);
}
module.exports = { recognizeBean };

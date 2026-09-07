// 云函数协议封装；阶段③启用。顶层不引用 wx，仅 call 函数体内使用
const env = require('../config/env');

function call(name, data) { // 签名即云函数协议 { name, action, ...payload }
  return wx.cloud.callFunction({ name, data }).then((r) => r.result);
}

module.exports = { call, enabled: () => env.USE_CLOUD };

// 照片上传：云模式传云存储返回 fileID；mock 模式原样返回临时路径
// prefix：云存储目录前缀（默认 beans/）
const env = require('../config/env');
function uploadImages(tempPaths, prefix) {
  if (!env.USE_CLOUD || !tempPaths || !tempPaths.length) return Promise.resolve(tempPaths || []);
  // 已是云存储 fileID（识别阶段在 processing 页提前上传）直接透传，避免重复上传
  return Promise.all(tempPaths.map((p, i) => {
    if (typeof p === 'string' && p.startsWith('cloud://')) return Promise.resolve(p);
    return wx.cloud.uploadFile({
      cloudPath: (prefix || 'beans/') + Date.now() + '-' + i + '.jpg',
      filePath: p,
    }).then((r) => r.fileID);
  }));
}
module.exports = { uploadImages };

// 照片上传：云模式传云存储返回 fileID；mock 模式原样返回临时路径
const env = require('../config/env');
function uploadImages(tempPaths) {
  if (!env.USE_CLOUD || !tempPaths || !tempPaths.length) return Promise.resolve(tempPaths || []);
  return Promise.all(tempPaths.map((p, i) =>
    wx.cloud.uploadFile({
      cloudPath: 'beans/' + Date.now() + '-' + i + '.jpg',
      filePath: p,
    }).then((r) => r.fileID)));
}
module.exports = { uploadImages };

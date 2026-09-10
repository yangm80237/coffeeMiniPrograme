// utils/image.js —— 照片预览 URL 解析（豆子编辑页图片点击放大用）
// cloud:// fileID 需先经 getTempFileURL 转临时链接才能被 wx.previewImage 显示；
// http(s)/本地临时路径原样透传。hasCloudFileID 为纯函数，可独立测试。

function hasCloudFileID(photos) {
  return (photos || []).some((p) => typeof p === 'string' && p.startsWith('cloud://'));
}

// 批量解析预览 URL：存在 cloud:// 时整体转换，否则原样返回
function resolvePreviewUrls(photos) {
  const list = (photos || []).filter((p) => typeof p === 'string' && p);
  if (!hasCloudFileID(list)) return Promise.resolve(list);
  return wx.cloud.getTempFileURL({ fileList: list }).then((r) => {
    const map = {};
    for (const f of r.fileList || []) map[f.fileID] = f.tempFileURL;
    return list.map((p) => map[p] || p);
  });
}

module.exports = { hasCloudFileID, resolvePreviewUrls };

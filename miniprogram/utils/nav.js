// 自定义导航度量：状态栏高度 + 与胶囊垂直对齐的导航行高（px）
// env(safe-area-inset-top) 在部分机型/模拟器上为 0，必须用系统接口动态计算
function navMetrics() {
  let statusBarPx = 44;
  let navH = 44;
  try {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    statusBarPx = win.statusBarHeight || 44;
    const menu = wx.getMenuButtonBoundingClientRect();
    if (menu && menu.height) {
      // 胶囊上下留白对称：(胶囊top - 状态栏) × 2 + 胶囊高 = 导航行高
      navH = (menu.top - statusBarPx) * 2 + menu.height;
    }
  } catch (e) { /* 取不到用保底值 */ }
  return { statusBarPx, navH };
}
module.exports = { navMetrics };

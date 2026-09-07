// 预置风味标签 45 个，按规格书 3.6 七分类逐行补齐
// 名称与规格书表格逐字一致；emoji 为占位，阶段④ Seedream 生成后替换 iconUrl
module.exports = [
  // 水果类（12）
  { _id: 'f01', name: '草莓', category: '水果类', iconUrl: '', emoji: '🍓', isBuiltin: true },
  { _id: 'f02', name: '橙子', category: '水果类', iconUrl: '', emoji: '🍊', isBuiltin: true },
  { _id: 'f03', name: '柠檬', category: '水果类', iconUrl: '', emoji: '🍋', isBuiltin: true },
  { _id: 'f04', name: '蓝莓', category: '水果类', iconUrl: '', emoji: '🫐', isBuiltin: true },
  { _id: 'f05', name: '桃子', category: '水果类', iconUrl: '', emoji: '🍑', isBuiltin: true },
  { _id: 'f06', name: '芒果', category: '水果类', iconUrl: '', emoji: '🥭', isBuiltin: true },
  { _id: 'f07', name: '菠萝', category: '水果类', iconUrl: '', emoji: '🍍', isBuiltin: true },
  { _id: 'f08', name: '苹果', category: '水果类', iconUrl: '', emoji: '🍎', isBuiltin: true },
  { _id: 'f09', name: '葡萄', category: '水果类', iconUrl: '', emoji: '🍇', isBuiltin: true },
  { _id: 'f10', name: '樱桃', category: '水果类', iconUrl: '', emoji: '🍒', isBuiltin: true },
  { _id: 'f11', name: '百香果', category: '水果类', iconUrl: '', emoji: '🟣', isBuiltin: true },
  { _id: 'f12', name: '猕猴桃', category: '水果类', iconUrl: '', emoji: '🥝', isBuiltin: true },
  // 花香类（6）
  { _id: 'f13', name: '茉莉', category: '花香类', iconUrl: '', emoji: '🤍', isBuiltin: true },
  { _id: 'f14', name: '玫瑰', category: '花香类', iconUrl: '', emoji: '🌹', isBuiltin: true },
  { _id: 'f15', name: '桂花', category: '花香类', iconUrl: '', emoji: '🌼', isBuiltin: true },
  { _id: 'f16', name: '洋甘菊', category: '花香类', iconUrl: '', emoji: '🌸', isBuiltin: true },
  { _id: 'f17', name: '薰衣草', category: '花香类', iconUrl: '', emoji: '💜', isBuiltin: true },
  { _id: 'f18', name: '橙花', category: '花香类', iconUrl: '', emoji: '🌼', isBuiltin: true },
  // 甜感类（6）
  { _id: 'f19', name: '蜂蜜', category: '甜感类', iconUrl: '', emoji: '🍯', isBuiltin: true },
  { _id: 'f20', name: '焦糖', category: '甜感类', iconUrl: '', emoji: '🍬', isBuiltin: true },
  { _id: 'f21', name: '香草', category: '甜感类', iconUrl: '', emoji: '🌿', isBuiltin: true },
  { _id: 'f22', name: '红糖', category: '甜感类', iconUrl: '', emoji: '🟤', isBuiltin: true },
  { _id: 'f23', name: '糖蜜', category: '甜感类', iconUrl: '', emoji: '🟫', isBuiltin: true },
  { _id: 'f24', name: '枫糖', category: '甜感类', iconUrl: '', emoji: '🥞', isBuiltin: true },
  // 坚果可可类（6）
  { _id: 'f25', name: '榛子', category: '坚果可可类', iconUrl: '', emoji: '🌰', isBuiltin: true },
  { _id: 'f26', name: '杏仁', category: '坚果可可类', iconUrl: '', emoji: '🥜', isBuiltin: true },
  { _id: 'f27', name: '黑巧', category: '坚果可可类', iconUrl: '', emoji: '🍫', isBuiltin: true },
  { _id: 'f28', name: '牛奶巧克力', category: '坚果可可类', iconUrl: '', emoji: '🍫', isBuiltin: true },
  { _id: 'f29', name: '花生', category: '坚果可可类', iconUrl: '', emoji: '🥜', isBuiltin: true },
  { _id: 'f30', name: '椰子', category: '坚果可可类', iconUrl: '', emoji: '🥥', isBuiltin: true },
  // 香料类（5）
  { _id: 'f31', name: '胡椒', category: '香料类', iconUrl: '', emoji: '⚫', isBuiltin: true },
  { _id: 'f32', name: '丁香', category: '香料类', iconUrl: '', emoji: '🟤', isBuiltin: true },
  { _id: 'f33', name: '肉豆蔻', category: '香料类', iconUrl: '', emoji: '🌰', isBuiltin: true },
  { _id: 'f34', name: '肉桂', category: '香料类', iconUrl: '', emoji: '🟫', isBuiltin: true },
  { _id: 'f35', name: '八角', category: '香料类', iconUrl: '', emoji: '⭐', isBuiltin: true },
  // 烘焙类（5）
  { _id: 'f36', name: '麦芽', category: '烘焙类', iconUrl: '', emoji: '🌾', isBuiltin: true },
  { _id: 'f37', name: '谷物', category: '烘焙类', iconUrl: '', emoji: '🌾', isBuiltin: true },
  { _id: 'f38', name: '烟熏', category: '烘焙类', iconUrl: '', emoji: '💨', isBuiltin: true },
  { _id: 'f39', name: '烤可可', category: '烘焙类', iconUrl: '', emoji: '🟤', isBuiltin: true },
  { _id: 'f40', name: '饼干', category: '烘焙类', iconUrl: '', emoji: '🍪', isBuiltin: true },
  // 其他（5）
  { _id: 'f41', name: '茶感', category: '其他', iconUrl: '', emoji: '🍵', isBuiltin: true },
  { _id: 'f42', name: '奶油', category: '其他', iconUrl: '', emoji: '🥛', isBuiltin: true },
  { _id: 'f43', name: '发酵感', category: '其他', iconUrl: '', emoji: '🍶', isBuiltin: true },
  { _id: 'f44', name: '草本', category: '其他', iconUrl: '', emoji: '🌿', isBuiltin: true },
  { _id: 'f45', name: '清爽', category: '其他', iconUrl: '', emoji: '💧', isBuiltin: true },
];

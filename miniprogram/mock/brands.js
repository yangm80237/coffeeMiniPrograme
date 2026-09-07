// 12 个内置品牌，覆盖 8 国：中国/美国/日本/德国/丹麦/挪威/韩国/埃塞俄比亚（规格书 4.1）
// flag 字段为 mock 便利字段；阶段③云实现由 flags.getFlag(country) 派生
module.exports = [
  { _id: 'b01', name: 'Seesaw', nameEn: 'Seesaw Coffee', logo: '', country: '中国', flag: '🇨🇳', description: '国内精品咖啡连锁，云南单品见长。', isBuiltin: true },
  { _id: 'b02', name: 'Blue Bottle', nameEn: 'Blue Bottle Coffee', logo: '', country: '美国', flag: '🇺🇸', description: '源自奥克兰的第三波咖啡代表，浅烘焙标杆。', isBuiltin: true },
  { _id: 'b03', name: 'Glitch Coffee', nameEn: 'Glitch Coffee', logo: '', country: '日本', flag: '🇯🇵', description: '东京浅草人气烘焙商，果调突出。', isBuiltin: true },
  { _id: 'b04', name: 'The Barn', nameEn: 'The Barn Coffee Roasters', logo: '', country: '德国', flag: '🇩🇪', description: '柏林精品烘焙商，专注单品浅烘。', isBuiltin: true },
  { _id: 'b05', name: 'Manner Coffee', nameEn: 'Manner Coffee', logo: '', country: '中国', flag: '🇨🇳', description: '上海本土连锁，性价比精品路线。', isBuiltin: true },
  { _id: 'b06', name: 'April Coffee', nameEn: 'April Coffee Roasters', logo: '', country: '丹麦', flag: '🇩🇰', description: '哥本哈根精品烘焙商，北欧极简风。', isBuiltin: true },
  { _id: 'b07', name: 'Tim Wendelboe', nameEn: 'Tim Wendelboe', logo: '', country: '挪威', flag: '🇳🇴', description: '奥斯陆北欧浅烘代表，轻盈通透。', isBuiltin: true },
  { _id: 'b08', name: 'Anthracite', nameEn: 'Anthracite Coffee', logo: '', country: '韩国', flag: '🇰🇷', description: '首尔精品烘焙商，黑金质感包装。', isBuiltin: true },
  { _id: 'b09', name: 'Gesha Village', nameEn: 'Gesha Village Coffee Estate', logo: '', country: '埃塞俄比亚', flag: '🇪🇹', description: '埃塞俄比亚瑰夏村庄园，顶级瑰夏产地。', isBuiltin: true },
  { _id: 'b10', name: 'Onyx Coffee Lab', nameEn: 'Onyx Coffee Lab', logo: '', country: '美国', flag: '🇺🇸', description: '阿肯色州精品烘焙商，溯源透明标杆。', isBuiltin: true },
  { _id: 'b11', name: 'Weekenders', nameEn: 'Weekenders Coffee', logo: '', country: '中国', flag: '🇨🇳', description: '国内精品烘焙商，周末灵感命名。', isBuiltin: true },
  { _id: 'b12', name: 'Koffee Mameya', nameEn: 'Koffee Mameya', logo: '', country: '日本', flag: '🇯🇵', description: '东京清澄白河名店，匠人手冲。', isBuiltin: true },
];

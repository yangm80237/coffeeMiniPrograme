// utils/agRoast.js —— Ag值/色值数字 → 烘焙度五档（与提示词 roastLevel 对齐：浅/中浅/中/中深/深）
// 判断标准（明确）：
// ① 数值优先（2-3 位）：Agtron / Ag / 色值 / 烘焙色值 + 数字，按 Agtron 色值表（值越大越浅）：
//    85-100 → 浅；75-84 → 中浅；65-74 → 中；55-64 → 中深；<55 → 深
// ② Ag + 个位档号（Ag1-Ag5）：Ag1→浅；Ag2→中浅；Ag3→中；Ag4→中深；Ag5→深
// ③ 无法解析 → 空字符串（交给模型 roastLevel 兜底）

const AG_LEVELS = { 1: '浅', 2: '中浅', 3: '中', 4: '中深', 5: '深' };

function agtronToRoast(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return '';
  if (n >= 85) return '浅';
  if (n >= 75) return '中浅';
  if (n >= 65) return '中';
  if (n >= 55) return '中深';
  return '深';
}

// 从包装标注文本解析烘焙标识 → 五档；无法解析返回 ''
function agValueToRoast(text) {
  const s = String(text || '');
  if (!s) return '';
  // ① 数值优先：Agtron/Ag/色值/烘焙色值 + 2-3 位数值（避免「Ag 55」被个位档号误吞）
  const num = s.match(/(?:agtron|ag|(?:烘焙\s*)?色值)\s*(\d{2,3})/i);
  if (num) return agtronToRoast(num[1]);
  // ② Ag + 个位档号（Ag1-Ag5）
  const band = s.match(/ag\s*([1-5])\b/i);
  if (band) return AG_LEVELS[Number(band[1])] || '';
  return '';
}

module.exports = { AG_LEVELS, agtronToRoast, agValueToRoast };

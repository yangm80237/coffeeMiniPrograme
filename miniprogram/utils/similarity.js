// utils/similarity.js —— 风味名相似度判断（库外新风味去重/合并用）
// 判定标准（明确）：
// 1. 归一化：小写、去空白 / 连字符 / 分隔符
// 2. 完全相等（归一化后）→ 相似度 1
// 3. 一方包含另一方（较短串长度 ≥ 2）→ 相似度 0.85（如「青葡萄」vs「葡萄」）
// 4. 编辑距离 ≤ 1 → 相似度 0.8（如「蓝苺」vs「蓝莓」）
// 5. 其余 → 相似度 = 1 - 编辑距离/较长串长度（下限 0）
// 阈值 SIMILAR_THRESHOLD = 0.6：
//   bestMatch(name).score ≥ 阈值 → 视为同一风味（不新建，映射到已有标签）
//   < 阈值 → 判定为库外新风味，自动创建

const SIMILAR_THRESHOLD = 0.6;

function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/[\s\-_·•.,、/]+/g, '');
}

// 标准编辑距离（DP，支持中文按码点比较）
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

// 相似度 ∈ [0, 1]
function similarity(a, b) {
  const x = normalizeName(a), y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) {
    const short = Math.min(x.length, y.length);
    if (short >= 2) return 0.85;
  }
  const d = editDistance(x, y);
  if (d <= 1) return 0.8;
  return Math.max(0, 1 - d / Math.max(x.length, y.length));
}

// 与风味库最相似项：返回 { score, name }；库空时 score 0
function bestMatch(name, existing) {
  let best = { score: 0, name: null };
  for (const n of existing || []) {
    const s = similarity(name, n);
    if (s > best.score) best = { score: s, name: n };
  }
  return best;
}

// 决策：与库内所有风味相似度均 < 阈值 → 需要新建
function shouldCreate(name, existing, threshold = SIMILAR_THRESHOLD) {
  return bestMatch(name, existing).score < threshold;
}

module.exports = { SIMILAR_THRESHOLD, normalizeName, editDistance, similarity, bestMatch, shouldCreate };

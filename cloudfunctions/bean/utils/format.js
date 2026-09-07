function formatDate(v, sep = '.') {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v + 'T00:00:00');
  const p = (n) => String(n).padStart(2, '0');
  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate())].join(sep);
}
function daysAgo(v, now = new Date()) {
  const a = new Date(v + 'T00:00:00'); const b = new Date(now); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
function avgScore(a, b) {
  const vals = [a, b].filter((x) => typeof x === 'number');
  if (!vals.length) return '';
  return (vals.reduce((s, x) => s + x, 0) / vals.length).toFixed(1);
}
function firstChar(name) { return name ? Array.from(name)[0] : '?'; }
module.exports = { formatDate, daysAgo, avgScore, firstChar };

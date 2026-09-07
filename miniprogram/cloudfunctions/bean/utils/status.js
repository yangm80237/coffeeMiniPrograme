// 四态模型与养豆期计算（规格书3.3；hurry 永不自动进入）
const toDate = (v) => (v instanceof Date ? v : new Date(v + 'T00:00:00'));
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (a, b) => Math.round((sod(b) - sod(a)) / 86400000);

function getRestDays(roastDate) {
  const m = toDate(roastDate).getMonth() + 1;
  return m >= 5 && m <= 10 ? 20 : 25;
}
function computeStatus(bean, now = new Date()) {
  const restDays = getRestDays(bean.roastDate);
  const since = daysBetween(toDate(bean.roastDate), now);
  const daysLeft = restDays - since;
  const auto = daysLeft > 0 ? 'resting' : 'drinking';
  const ov = bean.statusOverride;
  const status = (ov === 'hurry' || ov === 'finished' || ov === 'resting') ? ov : (ov === 'drinking' ? 'drinking' : auto);
  // 到期后从1起计；未到期手动开喝时按烘焙后第N天计
  const dayOfPeak = since >= restDays ? since - restDays + 1 : (status === 'drinking' ? since + 1 : null);
  return { status, restDays, daysLeft, dayOfPeak };
}
const META = { resting: { label: '养豆中', color: '#FAAD14' }, drinking: { label: '在喝', color: '#52C41A' },
  hurry: { label: '抓紧喝', color: '#F97316' }, finished: { label: '喝完', color: '#9CA3AF' } };
const statusMeta = (s) => META[s];
function statusBarText(bean, now = new Date()) {
  const { status, daysLeft, restDays, dayOfPeak } = computeStatus(bean, now);
  const w = bean.weight ? bean.weight + 'g · ' : '';
  if (status === 'resting') return '还需' + daysLeft + '天 · 养豆期' + restDays + '天';
  if (status === 'drinking') return w + '最佳赏味第' + dayOfPeak + '天';
  if (status === 'hurry') return w + '风味衰退期 · 尽快饮用';
  return w + '本袋已喝完';
}
module.exports = { getRestDays, computeStatus, statusMeta, statusBarText };

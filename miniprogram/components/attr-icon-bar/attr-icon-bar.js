const BASE = '/assets/icons/proposal1/';
const BREW_ICON = { '手冲': 'brewing.png', '意式': 'espresso_roast.png', '通用': 'omni_roast.png' };
Component({
  properties: { bean: { type: Object, value: {} } },
  data: { items: [] },
  observers: {
    bean(b) {
      if (!b || !b._id) return;
      this.setData({ items: [
        { icon: BASE + 'roast_date.png',    bg: 'var(--attr-roast-date)',  value: (b.roastDate || '').split('-').join('.'), label: '烘焙日期' },
        { icon: BASE + 'bean_variety.png',  bg: 'var(--attr-variety)',     value: b.variety || '—', label: '豆种' },
        { icon: BASE + 'process_method.png',bg: 'var(--attr-process)',     value: b.process || '—', label: '处理法' },
        { icon: BASE + 'country_region.png',bg: 'var(--attr-origin)',      value: b.origin || '—', label: '产区', sub: b.country },
        { icon: BASE + 'altitude.png',      bg: 'var(--attr-altitude)',    value: b.altitude || '—', label: '海拔' },
        { icon: BASE + 'roast_level.png',   bg: 'var(--attr-roast-level)', value: b.roastLevel ? b.roastLevel + '烘' : '—', label: '烘焙度' },
        { icon: BASE + (BREW_ICON[b.brewMethod] || 'omni_roast.png'), bg: 'var(--attr-brew)', value: b.brewMethod || '—', label: '冲煮' },
        { icon: BASE + 'bean_weight.png',   bg: 'var(--attr-weight)',      value: b.weight ? b.weight + 'g' : '—', label: '克重' },
      ] });
    },
  },
});

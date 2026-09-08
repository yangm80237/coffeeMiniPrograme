const { avgScore, firstChar } = require('../../utils/format');
const ROAST_CLS = { '浅': 'r1', '中浅': 'r1', '中': 'r2', '中深': 'r3', '深': 'r3' };
Component({
  properties: { bean: { type: Object, value: {} } },
  data: { avg: '', first: '?', topFlavors: [], roastCls: '' },
  observers: {
    bean(b) {
      if (!b || !b._id) return;
      const restPct = (b.statusInfo && b.statusInfo.restDays)
        ? Math.max(0, Math.min(100, Math.round((1 - b.statusInfo.daysLeft / b.statusInfo.restDays) * 100)))
        : 0;
      this.setData({
        avg: avgScore(b.myRating, b.wifeRating),
        first: firstChar(b.brand || b.name),
        topFlavors: (b.flavors || []).slice(0, 4),
        roastCls: ROAST_CLS[b.roastLevel] || '',
        restPct,
      });
    },
  },
  methods: {},
});

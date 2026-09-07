const { avgScore, firstChar } = require('../../utils/format');
const ROAST_CLS = { '浅': 'r1', '中浅': 'r1', '中': 'r2', '中深': 'r3', '深': 'r3' };
Component({
  properties: { bean: { type: Object, value: {} } },
  data: { avg: '', first: '?', topFlavors: [], roastCls: '' },
  observers: {
    bean(b) {
      if (!b || !b._id) return;
      this.setData({
        avg: avgScore(b.myRating, b.wifeRating),
        first: firstChar(b.brand || b.name),
        topFlavors: (b.flavors || []).slice(0, 3),
        roastCls: ROAST_CLS[b.roastLevel] || '',
      });
    },
  },
  methods: { onTap() { this.triggerEvent('tap'); } },
});

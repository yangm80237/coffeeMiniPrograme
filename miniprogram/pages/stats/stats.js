// 统计页——五段布局 + canvas 点阵地图（原型 screen-stats 1401–1471）
const statsApi = require('../../api/stats');

// 固定经纬锚点表（drawMap 产区标注用，[经度, 纬度]）
const ANCHORS = {
  '中国': [104, 35], '埃塞俄比亚': [40, 8], '肯尼亚': [38, 0], '巴西': [-52, -10],
  '哥伦比亚': [-73, 4], '危地马拉': [-90, 15], '洪都拉斯': [-87, 15], '印度尼西亚': [120, -2],
  '美国': [-100, 40], '也门': [47, 15], '巴拿马': [-80, 9], '卢旺达': [30, -2],
  '哥斯达黎加': [-84, 10], '日本': [138, 36], '德国': [10, 51], '丹麦': [10, 56],
  '挪威': [9, 61], '韩国': [128, 36],
};

// 固定种子伪随机（mulberry32）：每次进入页面点阵底图完全一致
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

Page({
  data: {
    loaded: false,
    headWeight: 0, bagCount: 0,
    segDrinking: {}, segResting: {}, segFinished: {}, legend: [],
    processText: '',
    countryDist: [], varietyDist: [],
    countryCount: 0, brandCount: 0, varietyCount: 0,
  },
  onShow() { this.refresh(); },
  onReady() { this.ready = true; this.tryDraw(); },
  refresh() {
    return statsApi.getStats().then((s) => {
      const d = s.statusDist;
      const total = d.resting + d.drinking + d.hurry + d.finished;
      const pct = (n) => (total ? Math.round(n / total * 100) : 0);
      // 外段=在喝+抓紧喝（drinking 段内嵌绿/橙两截并排）；子段宽为外段内百分比，两截相加=100
      const seg = d.drinking + d.hurry;
      const segPct = (n) => (seg ? Math.round(n / seg * 100) : 0);
      const maxC = s.countryDist.length ? s.countryDist[0].count : 1;
      const maxV = s.varietyDist.length ? s.varietyDist[0].count : 1;
      this.setData({
        loaded: true,
        headWeight: s.totalWeight, bagCount: total,
        segDrinking: { pct: pct(seg), greenW: segPct(d.drinking), hurryW: segPct(d.hurry) },
        segResting: { pct: pct(d.resting) },
        segFinished: { pct: pct(d.finished) },
        legend: [
          { label: '养豆中', color: '#FAAD14', count: d.resting },
          { label: '在喝', color: '#52C41A', count: d.drinking },
          { label: '抓紧喝', color: '#F97316', count: d.hurry },
          { label: '喝完', color: '#9CA3AF', count: d.finished },
        ],
        processText: Object.entries(s.processDist).map(([k, v]) => k + ' ' + v).join(' · '),
        countryDist: s.countryDist.map((c) => ({ ...c, width: Math.round(c.count / maxC * 100) })),
        varietyDist: s.varietyDist.map((v) => ({ ...v, width: Math.round(v.count / maxV * 100) })),
        countryCount: s.countryCount, brandCount: s.brandCount, varietyCount: s.varietyCount,
      }, () => this.tryDraw());
    });
  },
  tryDraw() { if (this.ready && this.data.loaded) this.drawMap(); },
  // canvas 2d 点阵地图：固定种子伪随机点阵底图 + 经纬锚点产区标注
  drawMap() {
    wx.createSelectorQuery().in(this).select('#map').fields({ node: true, size: true }).exec((res) => {
      const r = res && res[0];
      if (!r || !r.node) return;
      const { node, width, height } = r;
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;
      node.width = width * dpr; node.height = height * dpr;
      const ctx = node.getContext('2d');
      ctx.scale(dpr, dpr);
      const W = width, H = height;
      // 点阵底图：暖灰 #D8CDBB，固定种子伪随机撒点
      const rand = mulberry32(2026);
      ctx.fillStyle = '#D8CDBB';
      for (let x = 6; x < W; x += 12) {
        for (let y = 6; y < H; y += 12) {
          if (rand() < 0.45) continue;
          ctx.globalAlpha = 0.25 + rand() * 0.4;
          ctx.beginPath();
          ctx.arc(x + rand() * 4 - 2, y + rand() * 4 - 2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // 产区标注点：#C96F4A，半径 4 + count/max*6；经纬→画布 x=(lon+180)/360*W, y=(90-lat)/180*H
      const max = this.data.countryDist.length ? this.data.countryDist[0].count : 1;
      for (const c of this.data.countryDist) {
        const a = ANCHORS[c.name];
        if (!a) continue;
        const px = (a[0] + 180) / 360 * W;
        const py = (90 - a[1]) / 180 * H;
        const rad = 4 + c.count / max * 6;
        ctx.beginPath();
        ctx.fillStyle = '#C96F4A';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  },
});

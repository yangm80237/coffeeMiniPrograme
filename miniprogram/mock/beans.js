// 4 袋豆子覆盖四态；country/origin 拆分（country=产区国，origin=产区名）
// 相对今天动态生成 roastDate，消除契约测试对系统时钟的依赖
const fmt = (d) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

module.exports = [
  { _id: 'bean01', brandId: 'b02', name: 'Bella Donovan', country: '埃塞俄比亚', origin: '耶加雪菲',
    variety: '74158', process: '水洗', altitude: '2200m', roastLevel: '浅', brewMethod: '手冲',
    weight: 200, roastDate: '2026-08-28', inDate: '2026-09-01', flavorTagIds: ['f01', 'f07', 'f09'],
    flavorDesc: '草莓、蜂蜜、黑巧', photos: [], statusOverride: undefined, isNew: true,
    myRating: 4, wifeRating: null, myNotes: '', wifeNotes: '', createTime: '2026-09-01T10:00:00' },
  { _id: 'bean02', brandId: 'b03', name: 'Komichi', country: '埃塞俄比亚', origin: '西达摩',
    variety: '瑰夏', process: '日晒', altitude: '1900m', roastLevel: '中浅', brewMethod: '手冲',
    weight: 100, roastDate: daysAgo(59), inDate: '2026-07-20', flavorTagIds: ['f05', 'f13'],
    flavorDesc: '茉莉、茶感', photos: [], statusOverride: undefined,
    myRating: 5, wifeRating: 4, myNotes: '', wifeNotes: '', createTime: '2026-07-20T10:00:00' },
  { _id: 'bean03', brandId: 'b04', name: 'Kenya AA', country: '肯尼亚', origin: '涅里',
    variety: 'SL28', process: '水洗', altitude: '1800m', roastLevel: '中', brewMethod: '通用',
    weight: 250, roastDate: '2026-06-01', inDate: '2026-06-10', flavorTagIds: ['f02', 'f03'],
    flavorDesc: '橙子、柠檬', photos: [], statusOverride: 'hurry',
    myRating: null, wifeRating: 5, myNotes: '', wifeNotes: '', createTime: '2026-06-10T10:00:00' },
  { _id: 'bean04', brandId: 'b05', name: '云南日晒', country: '中国', origin: '保山',
    variety: '卡杜拉', process: '日晒', altitude: '1200m', roastLevel: '中深', brewMethod: '意式',
    weight: 340, roastDate: '2026-05-15', inDate: '2026-05-20', flavorTagIds: ['f08', 'f10'],
    flavorDesc: '焦糖、榛子', photos: [], statusOverride: 'finished',
    myRating: 3, wifeRating: 3, myNotes: '', wifeNotes: '', createTime: '2026-05-20T10:00:00' },
];

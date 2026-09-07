const { statusMeta } = require('../../utils/status');
Component({
  properties: { status: { type: String, value: 'resting' } },
  data: { meta: {} },
  observers: { status(v) { this.setData({ meta: statusMeta(v) || {} }); } },
});

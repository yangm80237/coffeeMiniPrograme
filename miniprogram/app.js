const env = require('./config/env');
App({
  onLaunch() {
    if (env.USE_CLOUD && wx.cloud) wx.cloud.init({ env: env.CLOUD_ENV_ID, traceUser: true });
  },
  globalData: { pendingPhotos: null, mainIndex: 0 },
});

const test = require('node:test');
const assert = require('node:assert');
const { hasCloudFileID } = require('../utils/image');

test('hasCloudFileID：cloud:// 判定（纯函数）', () => {
  assert.equal(hasCloudFileID(['cloud://a/1.jpg', 'cloud://a/2.jpg']), true);
  assert.equal(hasCloudFileID(['/tmp/a.jpg', 'http://x.com/1.jpg']), false);
  assert.equal(hasCloudFileID([]), false);
  assert.equal(hasCloudFileID(['cloud://x']), true);
});

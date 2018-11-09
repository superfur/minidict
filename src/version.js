'use strict';

const pkg = require('../package.json');

/**
 * 获取 EazyDict 版本信息
 */
function version() {
  console.log('--------------------------------');
  console.log(`  主程序 MiniDict: ${pkg.version}`);
  console.log('--------------------------------');
}

module.exports = version;
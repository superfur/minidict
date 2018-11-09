'use strict';

const config = require('./config');
const pkg = require('../../package.json');

let plugins = [];
const dependencies = Object.keys(pkg.dependencies).filter(d => /^minidict\-.+/.test(d));

/**
 * 根据配置文件刷选启用的 plugin
 */
if(Array.isArray(config.enable)) {
  // plugins = config.enable.filter(plugin => {
  //   return dependencies.includes(plugin);
  // });
  plugins = config.enable;
}

module.exports = plugins;

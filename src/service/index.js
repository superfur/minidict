'use strict';

const path = require('path');
const debug = require('../lib/debug');
const plugins = require('../lib/plugins');
const config = require('../lib/config');

/**
 * 查询逻辑
 * @param {*} words 
 * @param {*} types 
 */
function search(words, types) {
  if (plugins && !plugins.length) {
    console.log('没有启用任何插件');
    return;
  }

  const pluginList = plugins.map(plugin => {
    // debug(`load plugin ${plugin} use config: %O`, config.plugins[plugin]);
    const pluginPath = path.join(__dirname, '../plugins/', plugin);

    return require(pluginPath)(words);
  });

  return Promise.all(pluginList).then(data => {
    const successData = [];
    
    data.forEach(item => {
      // if (item.error.code !== 0) {
      //   debug(`${item.pluginName} error: ${item.error.message}`);
      // }

      successData.push(item);
    });

    return Promise.resolve(successData);
  });
};

module.exports = search;


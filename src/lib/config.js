'use strict';

const debug = require('./debug');
// const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

// const home = os.homedir();
const defaultConfigFile = path.join(__dirname, '../..', '.minidict.yml');
// const userConfigFile = path.join(home, '.minidict.yml');

// 创建用户配置
// if (!fs.pathExistsSync(userConfigFile)) {
//   fs.copySync(defaultConfigFile, userConfigFile);
// }

const content = fs.readFileSync(defaultConfigFile, 'utf-8');
const config = {};
let userConfig;

// 解析 yaml
try {
  userConfig = yaml.safeLoad(content);
} catch (err) {
  console.error(err);
  throw new Error(`用户配置文件解析错误: ${defaultConfigFile}`);
}

debug(`read config from ${defaultConfigFile}: %O`, userConfig);

// format config
Object.keys(userConfig).forEach(item => {
  const userConfigItem = userConfig[item];

  if (item === 'enable') {
    config[item] = userConfigItem.map(key => {
      return `minidict-${key}`;
    });
  } else if (item === 'plugins') {
    config.plugins = Object.create(null);

    Object.keys(userConfigItem).forEach(key => {
      config.plugins[`minidict-${key}`] = userConfigItem[key];
    });
  } else {
    config[item] = userConfig[item];
  }
});

debug('format config: %O', config);

module.exports = config;

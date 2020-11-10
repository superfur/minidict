"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("./debug");
const path = require("path");
const fs = require("fs-extra");
const yaml = require("js-yaml");
const defaultConfigFile = path.join(__dirname, '../..', '.minidict.yml');
const content = fs.readFileSync(defaultConfigFile, 'utf-8');
const config = {};
let userConfig;
try {
    userConfig = yaml.safeLoad(content);
}
catch (err) {
    console.error(err);
    throw new Error(`用户配置文件解析错误: ${defaultConfigFile}`);
}
debug_1.default(`read config from ${defaultConfigFile}: %O`, userConfig);
Object.keys(userConfig).forEach(item => {
    const userConfigItem = userConfig[item];
    if (item === 'enable') {
        config[item] = userConfigItem.map(key => {
            return `minidict-${key}`;
        });
    }
    else if (item === 'plugins') {
        config.plugins = Object.create(null);
        Object.keys(userConfigItem).forEach(key => {
            config.plugins[`minidict-${key}`] = userConfigItem[key];
        });
    }
    else {
        config[item] = userConfig[item];
    }
});
debug_1.default('format config: %O', config);
exports.default = config;
//# sourceMappingURL=config.js.map
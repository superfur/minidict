import debug from './debug';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

const defaultConfigFile = path.join(__dirname, '../..', '.minidict.yml');

const content = fs.readFileSync(defaultConfigFile, 'utf-8');
const config: any = {};
let userConfig;

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

export default config;

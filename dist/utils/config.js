import { createRequire } from 'module';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';
const require = createRequire(import.meta.url);
const debug = require('debug')('minidict');
const CONFIG_FILE = '.minidict.yml';
let userConfig = {};
try {
    const configPath = join(homedir(), CONFIG_FILE);
    if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        userConfig = load(content);
    }
}
catch (err) {
    console.error('读取配置文件失败:', err);
}
const config = {
    plugins: []
};
if (userConfig && userConfig.plugins) {
    for (const item in config) {
        const userConfigItem = userConfig[item] || [];
        config[item] = userConfigItem.map((key) => `minidict-${key}`);
    }
}
debug('format config: %O', config);
const Conf = require('conf');
const configInstance = new Conf({
    defaults: {
        plugins: ['bing', 'youdao']
    }
});
export async function getConfig(options) {
    return {
        plugins: [options.bing ? 'bing' : 'youdao']
    };
}
export const updateConfig = (newConfig) => {
    Object.entries(newConfig).forEach(([key, value]) => {
        configInstance.set(key, value);
    });
};
export default config;

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { homedir } from 'os';
import debug from './debug';

const CONFIG_FILE = '.minidict.yml';
let userConfig: any = {};

try {
    const configPath = path.join(homedir(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        userConfig = yaml.load(content);
    }
} catch (err) {
    console.error('读取配置文件失败:', err);
}

const config: Record<string, string[]> = {
    plugins: []
};

if (userConfig && userConfig.plugins) {
    for (const item in config) {
        const userConfigItem = userConfig[item] || [];
        config[item] = userConfigItem.map((key: string) => `minidict-${key}`);
    }
}

debug('format config: %O', config);

export default config;

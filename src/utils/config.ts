import type { Config } from '../types.js';
import { createRequire } from 'module';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';
const require = createRequire(import.meta.url);
const debug = require('debug')('minidict');

const CONFIG_FILE = '.minidict.yml';
let userConfig: any = {};

try {
    const configPath = join(homedir(), CONFIG_FILE);
    if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        userConfig = load(content);
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

const Conf = require('conf');

interface ConfigStore {
  store: Config;
  set(key: keyof Config, value: any): void;
}

const configInstance = new Conf({
  defaults: {
    plugins: ['bing', 'youdao']
  }
}) as ConfigStore;

interface CommandOptions {
  bing?: boolean;
  youdao?: boolean;
}

export async function getConfig(options: CommandOptions): Promise<Config> {
  return {
    plugins: [options.bing ? 'bing' : 'youdao']
  };
}

export const updateConfig = (newConfig: Partial<Config>): void => {
  Object.entries(newConfig).forEach(([key, value]) => {
    configInstance.set(key as keyof Config, value);
  });
};

export default config;

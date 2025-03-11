import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from './types.js';

const defaultConfig: Config = {
  plugins: ['bing', 'youdao']
};

export async function loadConfig(configPath?: string): Promise<Config> {
  try {
    const filePath = configPath || path.join(os.homedir(), '.minidict.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);
    return {
      ...defaultConfig,
      ...config
    };
  } catch (error) {
    // 如果配置文件不存在或读取失败，返回默认配置
    return defaultConfig;
  }
} 
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config, ProxyConfig } from './types.js';

const defaultConfig: Config = {
  plugins: ['bing', 'youdao', 'google'],
  showPhonetic: true,
  showExamples: false,
  maxExamples: 3,
  timeout: 3000
};

/**
 * 解析代理 URL 字符串为 ProxyConfig 对象
 * 支持格式: http://host:port, https://host:port, socks5://host:port
 * 以及带认证的格式: http://user:pass@host:port
 */
export function parseProxyUrl(url: string): ProxyConfig | null {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(':', '') as ProxyConfig['protocol'];
    const host = parsed.hostname;
    const port = parseInt(parsed.port, 10);
    const username = parsed.username || undefined;
    const password = parsed.password || undefined;

    if (!host || !port) {
      return null;
    }

    return {
      protocol,
      host,
      port,
      username,
      password
    };
  } catch {
    return null;
  }
}

/**
 * 从环境变量中获取代理配置
 * 支持 HTTP_PROXY, HTTPS_PROXY, ALL_PROXY 环境变量
 */
export function getProxyFromEnv(): ProxyConfig | undefined {
  const proxyUrl = process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (proxyUrl) {
    const proxy = parseProxyUrl(proxyUrl);
    return proxy || undefined;
  }
  return undefined;
}

export async function loadConfig(configPath?: string): Promise<Config> {
  try {
    const homeConfigPath = path.join(os.homedir(), '.minidict.json');
    const filePath = configPath || homeConfigPath;

    const content = await fs.readFile(filePath, 'utf-8');
    const userConfig: Partial<Config> = JSON.parse(content);

    // 合并用户配置和默认配置
    const config: Config = {
      plugins: Array.isArray(userConfig.plugins) ? userConfig.plugins : defaultConfig.plugins,
      showPhonetic: typeof userConfig.showPhonetic === 'boolean' ? userConfig.showPhonetic : defaultConfig.showPhonetic,
      showExamples: typeof userConfig.showExamples === 'boolean' ? userConfig.showExamples : defaultConfig.showExamples,
      maxExamples: typeof userConfig.maxExamples === 'number' ? userConfig.maxExamples : defaultConfig.maxExamples,
      proxy: userConfig.proxy || getProxyFromEnv()
    };

    return config;
  } catch (error) {
    // 如果配置文件不存在或读取失败，返回默认配置（包含环境变量中的代理）
    return {
      ...defaultConfig,
      proxy: getProxyFromEnv()
    };
  }
} 
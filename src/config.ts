import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config, ProxyConfig, UserConfig } from './types.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const defaultConfig: Readonly<Config> = Object.freeze({
  plugins: ['bing', 'youdao', 'google'],
  showPhonetic: true,
  showExamples: false,
  maxExamples: 3,
  timeout: 10000,
  from: 'auto',
  to: 'auto',
  cache: { enabled: true, ttl: SEVEN_DAYS_MS },
  autoUpdate: { enabled: true, checkInterval: ONE_DAY_MS },
  externalPlugins: []
});

const DEFAULT_PROXY_PORTS: Record<ProxyConfig['protocol'], number> = {
  http: 80,
  https: 443,
  socks: 1080,
  socks4: 1080,
  socks4a: 1080,
  socks5: 1080,
  socks5h: 1080
};

/**
 * 解析代理 URL 字符串为 ProxyConfig 对象
 * 支持格式: http://host:port, https://host:port, socks5://host:port
 * 以及带认证的格式: http://user:pass@host:port
 */
export function parseProxyUrl(url: string): ProxyConfig | null {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '').toLowerCase();
    if (!(scheme in DEFAULT_PROXY_PORTS)) {
      return null;
    }
    const protocol = scheme as ProxyConfig['protocol'];
    const host = parsed.hostname;
    // URL 会把协议默认端口（http:80 / https:443）规整为空串，省略端口时同样为空——
    // 两种情况都回退到协议默认端口，而不是判为非法。
    const port = parsed.port ? parseInt(parsed.port, 10) : DEFAULT_PROXY_PORTS[protocol];
    // URL 中的认证信息是百分号编码的；这里解码，发请求时再统一编码，避免二次编码。
    const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
    const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

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
 * 支持 HTTPS_PROXY, ALL_PROXY, HTTP_PROXY 环境变量。
 * 所有词典请求都是 https，因此 HTTPS_PROXY 优先，HTTP_PROXY 仅作兜底。
 */
export function getProxyFromEnv(): ProxyConfig | undefined {
  const candidates = [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy
  ];

  // 跳过无法解析的值，继续尝试下一个变量。
  for (const proxyUrl of candidates) {
    if (!proxyUrl) continue;
    const proxy = parseProxyUrl(proxyUrl);
    if (proxy) return proxy;
  }
  return undefined;
}

/** 配置里的 proxy 既可写成对象，也可写成 URL 字符串。 */
function resolveUserProxy(value: unknown): ProxyConfig | undefined {
  if (typeof value === 'string') {
    const proxy = parseProxyUrl(value);
    if (!proxy) throw new Error(`配置中的 proxy 不是合法的代理地址：${value}`);
    return proxy;
  }
  if (value && typeof value === 'object') return value as ProxyConfig;
  return undefined;
}

function pick<T>(value: unknown, type: 'boolean' | 'number' | 'string', fallback: T): T {
  return typeof value === type ? (value as T) : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function positive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

/**
 * 把用户提供的（可能不完整、类型不可靠的）配置与默认值合并为完整配置。
 * 纯函数：不读文件、不读环境变量，供库调用方直接使用。
 */
export function resolveConfig(user: UserConfig = {}): Config {
  return {
    plugins: stringList(user.plugins, defaultConfig.plugins),
    showPhonetic: pick(user.showPhonetic, 'boolean', defaultConfig.showPhonetic),
    showExamples: pick(user.showExamples, 'boolean', defaultConfig.showExamples),
    maxExamples: nonNegative(user.maxExamples, defaultConfig.maxExamples),
    timeout: positive(user.timeout, defaultConfig.timeout),
    from: pick(user.from, 'string', defaultConfig.from),
    to: pick(user.to, 'string', defaultConfig.to),
    proxy: resolveUserProxy(user.proxy),
    cache: {
      enabled: pick(user.cache?.enabled, 'boolean', defaultConfig.cache.enabled),
      ttl: nonNegative(user.cache?.ttl, defaultConfig.cache.ttl)
    },
    autoUpdate: {
      enabled: pick(user.autoUpdate?.enabled, 'boolean', defaultConfig.autoUpdate.enabled),
      checkInterval: nonNegative(
        user.autoUpdate?.checkInterval,
        defaultConfig.autoUpdate.checkInterval
      )
    },
    externalPlugins: stringList(user.externalPlugins, defaultConfig.externalPlugins)
  };
}

/** 默认配置文件路径：~/.minidict.json */
export function defaultConfigPath(): string {
  return path.join(os.homedir(), '.minidict.json');
}

/**
 * 读取配置文件并与默认值合并；未配置代理时回退到环境变量中的代理。
 * 查找顺序：显式传入的路径 → MINIDICT_CONFIG 环境变量 → ~/.minidict.json。
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  const explicitPath = configPath || process.env.MINIDICT_CONFIG;
  const filePath = explicitPath || defaultConfigPath();

  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    // 用户显式指定的配置文件读不到必须报错；默认路径不存在则使用默认配置。
    if (explicitPath) {
      throw new Error(`无法读取配置文件：${filePath}`);
    }
    return { ...resolveConfig(), proxy: getProxyFromEnv() };
  }

  // 配置文件存在但内容非法时明确报错——静默回退默认值会让用户的配置「神秘失效」。
  let userConfig: UserConfig;
  try {
    userConfig = JSON.parse(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`配置文件不是合法的 JSON：${filePath}（${detail}）`);
  }
  if (!userConfig || typeof userConfig !== 'object' || Array.isArray(userConfig)) {
    throw new Error(`配置文件内容必须是一个 JSON 对象：${filePath}`);
  }

  const config = resolveConfig(userConfig);
  return { ...config, proxy: config.proxy ?? getProxyFromEnv() };
}

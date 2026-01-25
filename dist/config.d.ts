import type { Config, ProxyConfig } from './types.js';
/**
 * 解析代理 URL 字符串为 ProxyConfig 对象
 * 支持格式: http://host:port, https://host:port, socks5://host:port
 * 以及带认证的格式: http://user:pass@host:port
 */
export declare function parseProxyUrl(url: string): ProxyConfig | null;
/**
 * 从环境变量中获取代理配置
 * 支持 HTTP_PROXY, HTTPS_PROXY, ALL_PROXY 环境变量
 */
export declare function getProxyFromEnv(): ProxyConfig | undefined;
export declare function loadConfig(configPath?: string): Promise<Config>;

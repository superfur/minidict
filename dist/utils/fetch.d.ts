import type { ProxyConfig } from '../types.js';
/**
 * 获取代理的 fetch agent
 * 支持 HTTP、HTTPS 和 SOCKS 代理
 */
export declare function getProxyAgent(proxy: ProxyConfig): Promise<{
    httpAgent?: unknown;
    httpsAgent?: unknown;
} | undefined>;
/**
 * 创建带有代理配置的 fetch 选项
 */
export declare function getFetchOptions(proxy?: ProxyConfig): Promise<RequestInit>;
/**
 * 获取代理 URL 字符串（用于需要直接传递 URL 的场景）
 */
export declare function getProxyUrl(proxy?: ProxyConfig): string | undefined;

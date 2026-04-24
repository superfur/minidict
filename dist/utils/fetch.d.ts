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
 * 带超时的 fetch 函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param timeoutMs 超时时间（毫秒），默认 3000ms
 */
export declare function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>;
/**
 * 带代理和超时的 fetch 函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param proxy 代理配置
 * @param timeoutMs 超时时间（毫秒），默认 3000ms
 */
export declare function fetchWithProxy(url: string, options?: RequestInit, proxy?: ProxyConfig, timeoutMs?: number): Promise<Response>;
/**
 * 获取代理 URL 字符串（用于需要直接传递 URL 的场景）
 */
export declare function getProxyUrl(proxy?: ProxyConfig): string | undefined;

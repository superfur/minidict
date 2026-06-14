import fetch, { type RequestInit, type Response } from 'node-fetch';
import type { ProxyConfig } from '../types.js';

const DEFAULT_TIMEOUT = 10000;

// 统一的默认请求头：插件只需传差异项，公共头（尤其 User-Agent）在此集中维护。
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
};

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('请求超时');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getProxyAgent(proxy: ProxyConfig): Promise<
  | {
      httpAgent?: unknown;
      httpsAgent?: unknown;
    }
  | undefined
> {
  if (!proxy) {
    return undefined;
  }

  const { protocol, host, port, username, password } = proxy;

  let proxyUrl: string;
  if (username && password) {
    proxyUrl = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
  } else {
    proxyUrl = `${protocol}://${host}:${port}`;
  }

  if (protocol === 'http' || protocol === 'https') {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const agent = new HttpsProxyAgent(proxyUrl);
    return { httpsAgent: agent };
  }

  if (protocol === 'socks4' || protocol === 'socks5') {
    const { SocksProxyAgent } = await import('socks-proxy-agent');
    const agent = new SocksProxyAgent(proxyUrl);
    return { httpsAgent: agent };
  }

  return undefined;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeoutMs}ms)`);
    }
    throw error;
  }
}

export async function fetchWithProxy(
  url: string,
  options: RequestInit = {},
  proxy?: ProxyConfig,
  timeoutMs: number = DEFAULT_TIMEOUT,
  retries: number = 1
): Promise<Response> {
  // 注意展开顺序：先铺开 options，再用合并后的 headers 覆盖，
  // 确保插件传入的 headers 只覆盖同名字段而非整体清空默认头（含 User-Agent）。
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers
    }
  };

  if (proxy) {
    const agentConfig = await getProxyAgent(proxy);
    if (agentConfig && agentConfig.httpsAgent) {
      (enhancedOptions as { agent?: unknown }).agent = agentConfig.httpsAgent;
    }
  }

  // 对瞬时网络错误做有限重试；超时不重试（避免成倍拉长等待时间）。
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, enhancedOptions, timeoutMs);
    } catch (error) {
      lastError = error;
      if (isTimeoutError(error) || attempt === retries) {
        throw error;
      }
      await delay(200 * (attempt + 1));
    }
  }
  throw lastError;
}

export function getProxyUrl(proxy?: ProxyConfig): string | undefined {
  if (!proxy) {
    return undefined;
  }

  const { protocol, host, port, username, password } = proxy;

  if (username && password) {
    return `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
  }
  return `${protocol}://${host}:${port}`;
}

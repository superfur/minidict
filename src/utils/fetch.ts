import fetch, { type RequestInit, type Response } from 'node-fetch';
import type { Agent } from 'http';
import type { ProxyConfig } from '../types.js';
import { MinidictError } from '../errors.js';

const DEFAULT_TIMEOUT = 10000;

// 统一的默认请求头：插件只需传差异项，公共头（尤其 User-Agent）在此集中维护。
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
};

export interface RequestContext {
  proxy?: ProxyConfig;
  /** 单次请求（含读取响应体）的超时，毫秒 */
  timeout?: number;
  /** 瞬时网络错误的重试次数（超时与 HTTP 错误不重试） */
  retries?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getProxyUrl(proxy?: ProxyConfig): string | undefined {
  if (!proxy) {
    return undefined;
  }

  const { protocol, host, port, username, password } = proxy;

  // 仅有用户名（无密码）的代理同样合法，不能丢弃认证信息。
  const auth = username
    ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ''}@`
    : '';
  return `${protocol}://${auth}${host}:${port}`;
}

/** 为代理配置创建对应的 Agent；不认识的协议直接报错（绝不静默直连）。 */
export async function getProxyAgent(proxy?: ProxyConfig): Promise<Agent | undefined> {
  if (!proxy) {
    return undefined;
  }

  const protocol: string = proxy.protocol;
  const proxyUrl = getProxyUrl(proxy) as string;

  if (protocol === 'http' || protocol === 'https') {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    return new HttpsProxyAgent(proxyUrl);
  }

  if (protocol.startsWith('socks')) {
    const { SocksProxyAgent } = await import('socks-proxy-agent');
    return new SocksProxyAgent(proxyUrl);
  }

  throw new MinidictError('NETWORK', `不支持的代理协议: ${protocol}`);
}

/**
 * 按 NO_PROXY / no_proxy 判断某 URL 是否应绕过代理。
 * 支持：`*`、精确主机名、域名后缀（`example.com` / `.example.com` / `*.example.com`）、`host:port`。
 */
export function shouldBypassProxy(
  url: string,
  noProxy: string = process.env.NO_PROXY ?? process.env.no_proxy ?? ''
): boolean {
  if (!noProxy.trim()) return false;

  let host: string;
  let port: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase();
    port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {
    return false;
  }

  for (const raw of noProxy.split(/[,\s]+/)) {
    const entry = raw.trim().toLowerCase();
    if (!entry) continue;
    if (entry === '*') return true;

    const match = entry.match(/^(.*?)(?::(\d+))?$/);
    const entryHost = (match?.[1] ?? entry).replace(/^\*?\./, '');
    const entryPort = match?.[2];
    if (!entryHost) continue;
    if (entryPort && entryPort !== port) continue;
    if (host === entryHost || host.endsWith(`.${entryHost}`)) return true;
  }
  return false;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** 把非 2xx 响应转成结构化错误。 */
export function ensureOk(response: Response): Response {
  if (response.ok) return response;
  if (response.status === 429) {
    throw new MinidictError('RATE_LIMIT', '请求过于频繁 (HTTP 429)，请稍后再试', 429);
  }
  throw new MinidictError('HTTP', `HTTP ${response.status}`, response.status);
}

/**
 * 发起请求并用 read 读取响应。超时覆盖「连接 + 读取响应体」全过程，
 * 避免服务端发完响应头后挂住导致无限等待。
 */
export async function request<T>(
  url: string,
  init: RequestInit,
  context: RequestContext,
  read: (response: Response) => Promise<T> | T
): Promise<T> {
  const timeoutMs = context.timeout ?? DEFAULT_TIMEOUT;
  const retries = context.retries ?? 1;

  // 注意展开顺序：先铺开 init，再用合并后的 headers 覆盖，
  // 确保调用方传入的 headers 只覆盖同名字段而非整体清空默认头（含 User-Agent）。
  const options: RequestInit = {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...(init.headers as Record<string, string> | undefined) }
  };

  if (context.proxy && !shouldBypassProxy(url)) {
    options.agent = await getProxyAgent(context.proxy);
  }

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return await read(response);
    } catch (error) {
      if (isAbortError(error)) {
        throw new MinidictError('TIMEOUT', `请求超时 (${timeoutMs}ms)`);
      }
      // 结构化错误（HTTP 状态、解析失败等）是确定性的，重试没有意义。
      if (error instanceof MinidictError) {
        throw error;
      }
      if (attempt >= retries) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new MinidictError('NETWORK', `网络请求失败：${detail}`);
      }
      await delay(200 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** GET/POST 并以文本返回响应体；非 2xx 抛结构化错误。 */
export function fetchText(
  url: string,
  init: RequestInit = {},
  context: RequestContext = {}
): Promise<string> {
  return request(url, init, context, response => ensureOk(response).text());
}

/** GET/POST 并解析 JSON；非 2xx 或非法 JSON 抛结构化错误。 */
export function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  context: RequestContext = {}
): Promise<T> {
  return request(url, init, context, async response => {
    const body = await ensureOk(response).text();
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new MinidictError('PARSE', '接口返回的不是合法 JSON');
    }
  });
}

/** 返回原始 Response（不检查状态码、不读取响应体）。 */
export function fetchWithProxy(
  url: string,
  options: RequestInit = {},
  proxy?: ProxyConfig,
  timeoutMs: number = DEFAULT_TIMEOUT,
  retries: number = 1
): Promise<Response> {
  return request(url, options, { proxy, timeout: timeoutMs, retries }, response => response);
}

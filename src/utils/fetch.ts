import type { ProxyConfig } from '../types.js';

/**
 * 获取代理的 fetch agent
 * 支持 HTTP、HTTPS 和 SOCKS 代理
 */
export async function getProxyAgent(proxy: ProxyConfig): Promise<{
  httpAgent?: unknown;
  httpsAgent?: unknown;
} | undefined> {
  if (!proxy) {
    return undefined;
  }

  const { protocol, host, port, username, password } = proxy;

  // 构建代理 URL
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

/**
 * 创建带有代理配置的 fetch 选项
 */
export async function getFetchOptions(proxy?: ProxyConfig): Promise<RequestInit> {
  const options: RequestInit = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
    }
  };

  if (proxy) {
    const agentConfig = await getProxyAgent(proxy);
    if (agentConfig) {
      (options as { agent?: unknown }).agent = agentConfig.httpsAgent;
    }
  }

  return options;
}

/**
 * 获取代理 URL 字符串（用于需要直接传递 URL 的场景）
 */
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

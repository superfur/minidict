/**
 * 获取代理的 fetch agent
 * 支持 HTTP、HTTPS 和 SOCKS 代理
 */
export async function getProxyAgent(proxy) {
    if (!proxy) {
        return undefined;
    }
    const { protocol, host, port, username, password } = proxy;
    let proxyUrl;
    if (username && password) {
        proxyUrl = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
    }
    else {
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
 * 带超时的 fetch 函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param timeoutMs 超时时间（毫秒），默认 10000ms
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`请求超时 (${timeoutMs}ms)`);
        }
        throw error;
    }
}
/**
 * 带代理和超时的 fetch 函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param proxy 代理配置
 * @param timeoutMs 超时时间（毫秒），默认 10000ms
 */
export async function fetchWithProxy(url, options = {}, proxy, timeoutMs = 10000) {
    const enhancedOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            ...options.headers
        },
        ...options
    };
    if (proxy) {
        const agentConfig = await getProxyAgent(proxy);
        if (agentConfig && agentConfig.httpsAgent) {
            enhancedOptions.agent = agentConfig.httpsAgent;
        }
    }
    return fetchWithTimeout(url, enhancedOptions, timeoutMs);
}
/**
 * 获取代理 URL 字符串（用于需要直接传递 URL 的场景）
 */
export function getProxyUrl(proxy) {
    if (!proxy) {
        return undefined;
    }
    const { protocol, host, port, username, password } = proxy;
    if (username && password) {
        return `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
    }
    return `${protocol}://${host}:${port}`;
}

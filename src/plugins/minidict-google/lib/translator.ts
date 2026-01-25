import type { TranslationResult, ProxyConfig } from '../../../types.js';
import fetch from 'node-fetch';

interface GoogleTranslateResponse {
  data?: {
    translations?: Array<{
      translatedText: string;
    }>;
  };
}

async function fetchWithProxy(url: string, options: RequestInit = {}, proxy?: ProxyConfig): Promise<globalThis.Response> {
  if (proxy) {
    const { getProxyUrl } = await import('../../../utils/fetch.js');
    const proxyUrl = getProxyUrl(proxy);
    if (proxyUrl) {
      const { HttpsProxyAgent } = await import('https-proxy-agent');
      const agent = new HttpsProxyAgent(proxyUrl);
      (options as { agent?: unknown }).agent = agent;
    }
  }
  return fetch(url, options as any) as unknown as Promise<globalThis.Response>;
}

function isChineseText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      return true;
    }
  }
  return false;
}

export async function translate(word: string, proxy?: ProxyConfig): Promise<TranslationResult> {
  try {
    const containsChinese = isChineseText(word);
    const sourceLang = containsChinese ? 'zh-CN' : 'en';
    const targetLang = containsChinese ? 'en' : 'zh-CN';

    const url = 'https://translate.googleapis.com/language/translate/v2';
    const params = new URLSearchParams({
      q: word,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    });

    const response = await fetchWithProxy(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, proxy);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`API 返回非 JSON 响应: ${contentType}`);
    }

    const data: GoogleTranslateResponse = await response.json() as GoogleTranslateResponse;

    if (data?.data?.translations?.[0]?.translatedText) {
      return {
        word,
        translations: [data.data.translations[0].translatedText],
        examples: [],
        pluginName: 'Google'
      };
    }

    throw new Error('翻译失败：未获取到有效的翻译结果');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Google 翻译失败');
  }
}

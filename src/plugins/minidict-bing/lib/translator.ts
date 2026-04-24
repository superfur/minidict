import type { TranslationResult, ProxyConfig } from '../../../types.js';
import { parse } from './parser.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

interface BingTranslateResponse {
  statusCode: number;
  translations: Array<{
    text: string;
    to: string;
  }>;
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

export async function translate(word: string, proxy?: ProxyConfig, timeoutMs: number = 3000): Promise<TranslationResult> {
  try {
    const containsChinese = /[\u4e00-\u9fa5]/.test(word);

    if (word.includes(' ')) {
      const translationUrl = 'https://cn.bing.com/ttranslatev3';
      const params = new URLSearchParams({
        fromLang: containsChinese ? 'zh-Hans' : 'en',
        to: containsChinese ? 'en' : 'zh-Hans',
        text: word
      });

      const response = await fetchWithProxy(translationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://cn.bing.com',
          'Referer': 'https://cn.bing.com/translator'
        },
        body: params.toString()
      }, proxy, timeoutMs);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API 返回非 JSON 响应: ${contentType}`);
      }

      let data: BingTranslateResponse;
      try {
        data = await response.json() as BingTranslateResponse;
      } catch (jsonError) {
        throw new Error('解析 API 响应失败');
      }
      if (data?.translations?.[0]?.text) {
        return {
          word,
          translations: [data.translations[0].text],
          examples: [],
          pluginName: 'Bing'
        };
      }
    }

    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}`;
    const response = await fetchWithProxy(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    }, proxy, timeoutMs);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const result = parse(html);
    return {
      ...result,
      word
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '翻译失败');
  }
} 
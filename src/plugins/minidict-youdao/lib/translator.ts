import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../../types.js';
import { parse } from './parser.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

interface YoudaoTranslateResponse {
  fanyi?: {
    tran: string;
  };
}

export class YoudaoTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;
  private timeoutMs: number = 3000;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  setTimeout(timeoutMs: number): void {
    this.timeoutMs = timeoutMs;
  }

  async translate(word: string): Promise<TranslationResult> {
    try {
      const containsChinese = /[\u4e00-\u9fa5]/.test(word);
      
      if (word.includes(' ')) {
        const translationUrl = 'https://dict.youdao.com/jsonapi';
        const params = new URLSearchParams({
          q: word,
          dicts: JSON.stringify({
            count: 99,
            dicts: [['ec', 'ce']]
          }),
          client: 'web',
          keyfrom: 'dict.top'
        });

        const response = await fetchWithProxy(`${translationUrl}?${params.toString()}`, {
          headers: {
            'Referer': 'https://dict.youdao.com/'
          }
        }, this.proxy, this.timeoutMs);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`API 返回非 JSON 响应: ${contentType}`);
        }

        let data: YoudaoTranslateResponse;
        try {
          data = await response.json() as YoudaoTranslateResponse;
        } catch (jsonError) {
          throw new Error('解析 API 响应失败');
        }
        if (data?.fanyi?.tran) {
          return {
            word,
            translations: [data.fanyi.tran],
            examples: [],
            pluginName: 'Youdao'
          };
        }
      }

      const url = containsChinese
        ? `https://dict.youdao.com/w/eng/${encodeURIComponent(word)}`
        : `https://dict.youdao.com/w/${encodeURIComponent(word)}`;

      const response = await fetchWithProxy(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://dict.youdao.com/'
        }
      }, this.proxy, this.timeoutMs);
      
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
      throw new Error(error instanceof Error ? error.message : '网络请求失败');
    }
  }
} 
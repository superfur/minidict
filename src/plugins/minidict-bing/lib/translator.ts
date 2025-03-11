import type { TranslationResult } from '../../../types.js';
import { parse } from './parser.js';
import fetch from 'node-fetch';

interface BingTranslateResponse {
  statusCode: number;
  translations: Array<{
    text: string;
    to: string;
  }>;
}

export async function translate(word: string): Promise<TranslationResult> {
  try {
    // 检查是否包含中文字符
    const containsChinese = /[\u4e00-\u9fa5]/.test(word);

    // 如果是短语或句子，使用翻译接口
    if (word.includes(' ')) {
      const translationUrl = 'https://cn.bing.com/ttranslatev3';
      const params = new URLSearchParams({
        fromLang: containsChinese ? 'zh-Hans' : 'en',
        to: containsChinese ? 'en' : 'zh-Hans',
        text: word
      });

      const response = await fetch(translationUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://cn.bing.com',
          'Referer': 'https://cn.bing.com/translator'
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as BingTranslateResponse;
      if (data?.translations?.[0]?.text) {
        return {
          word,
          translations: [data.translations[0].text],
          examples: [],
          pluginName: 'Bing'
        };
      }
    }

    // 如果是单词，使用词典接口
    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    });

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
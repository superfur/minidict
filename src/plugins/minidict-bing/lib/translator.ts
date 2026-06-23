import type { TranslationResult, ProxyConfig } from '../../../types.js';
import { parse } from './parser.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

interface BingTranslateItem {
  translations?: Array<{ text: string; to: string }>;
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * 短语/整句走 Bing Translator 的真实机翻接口 ttranslatev3。
 * 该接口需要先从翻译器页面取得防滥用令牌（key/token）与 IG，缺一不可，
 * 否则会被重定向或返回空响应。必须用 www.bing.com（cn.bing.com 会 301 并丢弃 POST 体）。
 */
async function translateText(
  word: string,
  containsChinese: boolean,
  proxy?: ProxyConfig,
  timeoutMs: number = 10000
): Promise<TranslationResult> {
  const pageResp = await fetchWithProxy(
    'https://www.bing.com/translator',
    { headers: { 'User-Agent': UA } },
    proxy,
    timeoutMs
  );
  if (!pageResp.ok) {
    throw new Error(`HTTP error! status: ${pageResp.status}`);
  }
  const page = await pageResp.text();

  const ig = page.match(/IG:"([0-9A-F]+)"/)?.[1];
  const abuse = page.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)",\d+\]/);
  if (!ig || !abuse) {
    throw new Error('无法获取 Bing 翻译令牌');
  }
  const [, key, token] = abuse;

  const params = new URLSearchParams({
    fromLang: containsChinese ? 'zh-Hans' : 'en',
    to: containsChinese ? 'en' : 'zh-Hans',
    text: word,
    token,
    key
  });

  const response = await fetchWithProxy(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${ig}&IID=translator.5023.1&mkt=zh-CN`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Origin: 'https://www.bing.com',
        Referer: 'https://www.bing.com/translator'
      },
      body: params.toString()
    },
    proxy,
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API 返回非 JSON 响应: ${contentType}`);
  }

  let data: BingTranslateItem[];
  try {
    data = (await response.json()) as BingTranslateItem[];
  } catch {
    throw new Error('解析 API 响应失败');
  }

  const text = data?.[0]?.translations?.[0]?.text;
  if (text) {
    return { word, translations: [text], examples: [], pluginName: 'Bing' };
  }
  throw new Error('翻译失败：未获取到有效的翻译结果');
}

export async function translate(word: string, proxy?: ProxyConfig, timeoutMs: number = 10000): Promise<TranslationResult> {
  try {
    const containsChinese = /[一-龥]/.test(word);

    // 多词（短语/句子）走真实机翻接口；单词走词典页抓取。
    if (word.includes(' ')) {
      return await translateText(word, containsChinese, proxy, timeoutMs);
    }

    // 必须带 mkt=zh-CN，否则 Bing 会返回「无结果」页面而非真正的词典内容。
    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}&mkt=zh-CN`;
    const response = await fetchWithProxy(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          Connection: 'keep-alive',
          'Cache-Control': 'max-age=0'
        }
      },
      proxy,
      timeoutMs
    );

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

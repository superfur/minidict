import type { DictionaryPlugin, TranslateContext, TranslationResult } from '../../types.js';
import { MinidictError } from '../../errors.js';
import { detectLanguage, isSingleWord, isZhEnPair } from '../../lang.js';
import { fetchJson, fetchText } from '../../utils/fetch.js';
import { parse } from './parser.js';

interface BingTranslateItem {
  translations?: Array<{ text: string; to: string }>;
}

const DISPLAY_NAME = 'Bing';

/** 通用语言代码 → Bing Translator 的写法。 */
export function toBingLang(code: string): string {
  if (code === 'auto') return 'auto-detect';
  if (code === 'zh') return 'zh-Hans';
  if (code === 'zh-TW') return 'zh-Hant';
  return code;
}

/** 单词（中英互译）：抓取必应词典页。 */
async function lookupWord(word: string, context: TranslateContext): Promise<TranslationResult> {
  // 必须带 mkt=zh-CN，否则 Bing 会返回「无结果」页面而非真正的词典内容。
  const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}&mkt=zh-CN`;
  const html = await fetchText(
    url,
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    },
    context
  );
  return { ...parse(html), word, pluginName: DISPLAY_NAME };
}

/**
 * 短语 / 整句 / 非中英方向：走 Bing Translator 的机翻接口 ttranslatev3。
 * 该接口需要先从翻译器页面取得令牌（key/token）与 IG，缺一不可。
 * 必须用 www.bing.com（cn.bing.com 会 301 并丢弃 POST 体）。
 */
async function translateText(text: string, context: TranslateContext): Promise<TranslationResult> {
  const page = await fetchText('https://www.bing.com/translator', {}, context);

  const ig = page.match(/IG:"([0-9A-F]+)"/)?.[1];
  const abuse = page.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)",\d+\]/);
  if (!ig || !abuse) {
    throw new MinidictError('PARSE', '无法获取 Bing 翻译令牌（页面结构可能已变化）');
  }
  const [, key, token] = abuse;

  const params = new URLSearchParams({
    fromLang: toBingLang(context.from),
    to: toBingLang(context.to),
    text,
    token,
    key
  });

  const data = await fetchJson<BingTranslateItem[] | { statusCode?: number }>(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${ig}&IID=translator.5023.1`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://www.bing.com',
        Referer: 'https://www.bing.com/translator'
      },
      body: params.toString()
    },
    context
  );

  const translated = Array.isArray(data) ? data[0]?.translations?.[0]?.text : undefined;
  if (!translated) {
    throw new MinidictError('NO_RESULT', '未获取到有效的翻译结果');
  }
  return { word: text, translations: [translated], examples: [], pluginName: DISPLAY_NAME };
}

const bingPlugin: DictionaryPlugin = {
  displayName: DISPLAY_NAME,

  async translate(text: string, context: TranslateContext): Promise<TranslationResult> {
    const source = context.from === 'auto' ? detectLanguage(text) : context.from;
    // 词典页只收录中英单词；其余情况交给机翻接口。
    if (isSingleWord(text) && isZhEnPair(source, context.to)) {
      return lookupWord(text, context);
    }
    return translateText(text, context);
  }
};

export default bingPlugin;

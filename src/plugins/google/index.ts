import type { DictionaryPlugin, TranslateContext, TranslationResult } from '../../types.js';
import { MinidictError } from '../../errors.js';
import { fetchJson } from '../../utils/fetch.js';

// translate_a/single 的返回是嵌套数组。我们额外请求 dt=bd（词典）与 dt=rm（音标/转写），
// 使 Google 也能给出音标与按词性归类的释义，与 Youdao/Bing 输出结构保持一致：
//   data[0]  译文片段 + 一段 [null,null,<译文转写>,<源词音标>]
//   data[1]  词典：[ [词性, [译词…], …], … ]
type GoogleSegment = (string | null)[];
type GoogleDictEntry = [string, string[], ...unknown[]];
export type GoogleResponse = [GoogleSegment[] | null, GoogleDictEntry[] | null, ...unknown[]];

const DISPLAY_NAME = 'Google';

// 把 Google 的英文词性名映射为与其它词典一致的缩写，交由 formatter 对齐展示。
const POS_MAP: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'int.',
  exclamation: 'int.',
  determiner: 'det.',
  article: 'art.',
  numeral: 'num.',
  abbreviation: 'abbr.',
  prefix: 'pref.',
  suffix: 'suf.'
};

/** 通用语言代码 → Google 的写法。 */
export function toGoogleLang(code: string): string {
  if (code === 'zh') return 'zh-CN';
  return code;
}

/**
 * Google 对无法翻译的输入（乱码、不存在的词）会原样返回原文。
 * 唯一的「译文」与原文相同时视为没有结果，而不是把原文当释义展示。
 */
function isEcho(translations: string[], word: string): boolean {
  return (
    translations.length === 1 && translations[0].trim().toLowerCase() === word.trim().toLowerCase()
  );
}

/** 解析 translate_a/single 的响应；没有任何译文时抛 NO_RESULT。 */
export function parseGoogleResponse(data: unknown, word: string): TranslationResult {
  const root = Array.isArray(data) ? (data as GoogleResponse) : null;
  const segments = root && Array.isArray(root[0]) ? root[0] : [];

  // 译文：拼接所有「首元素为字符串」的片段。
  const translatedText = segments
    .filter(seg => Array.isArray(seg) && typeof seg[0] === 'string')
    .map(seg => seg[0] as string)
    .join('')
    .trim();

  // 音标：在译文片段里寻找 [null, null, <转写>, <源词音标>]，只取源词音标（第 4 位）。
  let phonetic = '';
  for (const seg of segments) {
    if (Array.isArray(seg) && seg[0] == null) {
      const candidate = seg[3];
      if (typeof candidate === 'string' && candidate.trim()) {
        phonetic = candidate.trim();
      }
    }
  }

  // 译文优先作为主释义行（最可靠）；dt=bd 的反查词典有时含噪声词，只作补充。
  const translations: string[] = [];
  if (translatedText) translations.push(translatedText);

  // 词典：按词性归类的释义，渲染成与其它词典一致的「词性 + 释义」行（每类最多 6 个词）。
  const dict = root && Array.isArray(root[1]) ? root[1] : [];
  for (const entry of dict) {
    if (!Array.isArray(entry)) continue;
    const posName = typeof entry[0] === 'string' ? entry[0].toLowerCase() : '';
    const terms = (Array.isArray(entry[1]) ? entry[1].filter(t => typeof t === 'string') : [])
      .filter(t => t !== translatedText)
      .slice(0, 6);
    // 只保留含 ≥2 个释义的词性行；单词条多为反查噪声（主译文已单列，不会丢信息）。
    if (terms.length < 2) continue;
    const pos = POS_MAP[posName] || (posName ? `${posName}.` : '');
    translations.push(`${pos} ${terms.join('；')}`.trim());
  }

  if (translations.length === 0 || isEcho(translations, word)) {
    throw new MinidictError('NO_RESULT', '未获取到有效的翻译结果');
  }

  return {
    word,
    // Google 给出的是音节重拼（非严格 IPA，也不分英/美），用裸字符串音标，
    // 由 formatter 渲染成中性的 [..]，不冠「英/美」标签。
    phonetic: phonetic || undefined,
    translations,
    examples: [],
    pluginName: DISPLAY_NAME
  };
}

/** 解析备用接口 translate_a/t 的响应：["译文"] 或 [["译文","源语言"]]。 */
export function parseGoogleFallback(data: unknown, word: string): TranslationResult {
  let text: unknown = Array.isArray(data) ? data[0] : undefined;
  if (Array.isArray(text)) text = text[0];
  if (typeof text !== 'string' || !text.trim() || isEcho([text], word)) {
    throw new MinidictError('NO_RESULT', '未获取到有效的翻译结果');
  }
  return { word, translations: [text.trim()], examples: [], pluginName: DISPLAY_NAME };
}

function buildQuery(text: string, context: TranslateContext, client: string): URLSearchParams {
  return new URLSearchParams({
    client,
    sl: toGoogleLang(context.from),
    tl: toGoogleLang(context.to),
    q: text
  });
}

const googlePlugin: DictionaryPlugin = {
  displayName: DISPLAY_NAME,

  async translate(text: string, context: TranslateContext): Promise<TranslationResult> {
    // 主接口：Google 翻译网页版的免 key 接口（client=gtx），带词典与音标。
    const params = buildQuery(text, context, 'gtx');
    // dt 可重复：t=译文，bd=词典，rm=音标/转写
    for (const dt of ['t', 'bd', 'rm']) params.append('dt', dt);

    try {
      const data = await fetchJson<unknown>(
        `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
        {},
        context
      );
      return parseGoogleResponse(data, text);
    } catch (error) {
      // 仅在主接口「可达但不可用」（限流 / HTTP 错误 / 响应异常）时改用备用接口；
      // 超时或网络不通时备用接口同样到不了，重试只会让等待翻倍。
      const code = error instanceof MinidictError ? error.code : undefined;
      if (code !== 'RATE_LIMIT' && code !== 'HTTP' && code !== 'PARSE') {
        throw error;
      }
      const fallback = buildQuery(text, context, 'dict-chrome-ex');
      const data = await fetchJson<unknown>(
        `https://clients5.google.com/translate_a/t?${fallback.toString()}`,
        {},
        context
      );
      return parseGoogleFallback(data, text);
    }
  }
};

export default googlePlugin;

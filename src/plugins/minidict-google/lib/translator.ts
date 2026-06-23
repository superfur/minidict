import type { TranslationResult, ProxyConfig } from '../../../types.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

// translate_a/single 的返回是嵌套数组。我们额外请求 dt=bd（词典）与 dt=rm（音标/转写），
// 使 Google 也能给出音标与按词性归类的释义，与 Youdao/Bing 输出结构保持一致：
//   data[0]  译文片段 + 一段 [null,null,<译文转写>,<源词音标>]
//   data[1]  词典：[ [词性, [译词…], …], … ]
type GoogleSegment = (string | null)[];
type GoogleDictEntry = [string, string[], ...unknown[]];
type GoogleResponse = [GoogleSegment[] | null, GoogleDictEntry[] | null, ...unknown[]];

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

function isChineseText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      return true;
    }
  }
  return false;
}

export async function translate(word: string, proxy?: ProxyConfig, timeoutMs: number = 10000): Promise<TranslationResult> {
  try {
    // 目标语言：中文输入译为英文，否则译为中文；源语言交由 Google 自动检测（sl=auto）。
    const targetLang = isChineseText(word) ? 'en' : 'zh-CN';

    // 使用 Google 翻译网页版的免 key 接口（client=gtx），而非需要付费密钥的官方 v2 接口。
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: targetLang, q: word });
    // dt 可重复：t=译文，bd=词典，rm=音标/转写
    params.append('dt', 't');
    params.append('dt', 'bd');
    params.append('dt', 'rm');

    const response = await fetchWithProxy(`${url}?${params.toString()}`, {}, proxy, timeoutMs);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data: GoogleResponse;
    try {
      data = (await response.json()) as GoogleResponse;
    } catch {
      throw new Error('解析 API 响应失败');
    }

    const segments = Array.isArray(data) ? data[0] : null;

    // 译文：拼接所有「首元素为字符串」的片段。
    const translatedText = Array.isArray(segments)
      ? segments
          .filter(seg => Array.isArray(seg) && typeof seg[0] === 'string')
          .map(seg => seg[0] as string)
          .join('')
          .trim()
      : '';

    // 音标：在译文片段里寻找 [null, null, <转写>, <源词音标>]，取末位的源词音标。
    let phoneticStr = '';
    if (Array.isArray(segments)) {
      for (const seg of segments) {
        if (Array.isArray(seg) && seg[0] == null) {
          const candidate = seg[3] || seg[2];
          if (typeof candidate === 'string' && candidate.trim()) {
            phoneticStr = candidate.trim();
          }
        }
      }
    }

    // 译文优先作为主释义行（最可靠）；dt=bd 的反查词典有时含噪声词，只作补充。
    const translations: string[] = [];
    if (translatedText) translations.push(translatedText);

    // 词典：按词性归类的释义，渲染成与其它词典一致的「词性 + 释义」行（每类最多 6 个词）。
    const dict = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
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

    if (translations.length === 0) {
      throw new Error('翻译失败：未获取到有效的翻译结果');
    }

    return {
      word,
      // Google 给出的是音节重拼（非严格 IPA，也不分英/美），用裸字符串音标，
      // 由 formatter 渲染成中性的 [..]，不冠「英/美」标签。
      phonetic: phoneticStr || undefined,
      translations,
      examples: [],
      pluginName: 'Google'
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Google 翻译失败');
  }
}

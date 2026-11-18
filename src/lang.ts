/**
 * 语言代码归一与方向推断。
 * 对外统一使用简短代码：zh / zh-TW / en / ja / ko / fr / de / es / ru …
 * 各插件再映射到自己接口需要的写法（如 Google 的 zh-CN、Bing 的 zh-Hans）。
 */

const ALIASES: Record<string, string> = {
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-sg': 'zh',
  cn: 'zh',
  chs: 'zh',
  chinese: 'zh',
  中文: 'zh',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-hant': 'zh-TW',
  cht: 'zh-TW',
  eng: 'en',
  english: 'en',
  英文: 'en',
  jp: 'ja',
  jap: 'ja',
  japanese: 'ja',
  日文: 'ja',
  kr: 'ko',
  kor: 'ko',
  korean: 'ko',
  韩文: 'ko'
};

/** 归一用户输入的语言代码；空值 / auto 返回 'auto'。 */
export function normalizeLang(code?: string): string {
  const raw = (code ?? '').trim();
  if (!raw) return 'auto';
  const lower = raw.toLowerCase();
  if (lower === 'auto' || lower === 'auto-detect') return 'auto';
  return ALIASES[lower] ?? lower;
}

const RE_KANA = /[぀-ヿㇰ-ㇿ]/;
const RE_HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const RE_HAN = /[㐀-䶿一-鿿豈-﫿]/;
const RE_CYRILLIC = /[Ѐ-ӿ]/;

/**
 * 按文字系统粗略推断语言。只用于决定翻译方向与路由，
 * 拉丁字母一律视为 en（无法仅凭字母区分英/法/德…，需要时请用 --from 指定）。
 */
export function detectLanguage(text: string): string {
  if (RE_KANA.test(text)) return 'ja';
  if (RE_HANGUL.test(text)) return 'ko';
  if (RE_HAN.test(text)) return 'zh';
  if (RE_CYRILLIC.test(text)) return 'ru';
  return 'en';
}

export interface LanguagePair {
  /** 源语言：用户指定的代码，未指定为 'auto' */
  from: string;
  /** 目标语言：始终是具体代码 */
  to: string;
  /** 实际推断出的源语言（用户指定时即为该值） */
  source: string;
}

/** 解析翻译方向：未指定目标语言时，中文 → en，其它 → zh。 */
export function resolveLanguages(text: string, from?: string, to?: string): LanguagePair {
  const fromCode = normalizeLang(from);
  const source = fromCode === 'auto' ? detectLanguage(text) : fromCode;
  let toCode = normalizeLang(to);
  if (toCode === 'auto') {
    toCode = source === 'zh' || source === 'zh-TW' ? 'en' : 'zh';
  }
  return { from: fromCode, to: toCode, source };
}

/** 该方向是否为（简体）中文与英文互译——词典类来源只支持这一种。 */
export function isZhEnPair(source: string, to: string): boolean {
  return (source === 'zh' && to === 'en') || (source === 'en' && to === 'zh');
}

/** 输入是否为单个词（不含空白）。 */
export function isSingleWord(text: string): boolean {
  return !/\s/.test(text.trim());
}

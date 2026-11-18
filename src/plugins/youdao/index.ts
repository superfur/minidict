import type {
  DictionaryPlugin,
  Example,
  Phonetic,
  TranslateContext,
  TranslationResult
} from '../../types.js';
import { MinidictError } from '../../errors.js';
import { detectLanguage, isSingleWord, isZhEnPair } from '../../lang.js';
import { fetchJson } from '../../utils/fetch.js';

const DISPLAY_NAME = 'Youdao';
const MAX_WEB_MEANINGS = 6;
const MAX_CE_WORDS = 8;

// 有道 jsonapi 的相关字段（仅声明用到的部分）：
//   ec.word[].usphone/ukphone   英→中：音标
//   ec.word[].trs[].tr[].l.i[]  英→中：释义（形如 "int. 喂，你好…"）
//   ce.word[].trs[].tr[].l.i[]  中→英：["", { "#text": "hello" }] 形式的英文词
//   simple.word[].phone         中文词的拼音
//   fanyi.tran                  机器翻译（偶尔提供）
//   web_trans["web-translation"][].trans[].value  网络释义
//   blng_sents_part["sentence-pair"][]            双语例句
type LooseItem = string | { '#text'?: string } | null;

interface YoudaoTr {
  l?: { i?: LooseItem[] | string };
}

export interface YoudaoJsonApi {
  ec?: {
    word?: Array<{ usphone?: string; ukphone?: string; trs?: Array<{ tr?: YoudaoTr[] }> }>;
  };
  ce?: { word?: Array<{ trs?: Array<{ tr?: YoudaoTr[] }> }> };
  simple?: { word?: Array<{ phone?: string; usphone?: string; ukphone?: string }> };
  fanyi?: { tran?: string };
  web_trans?: {
    'web-translation'?: Array<{ key?: string; trans?: Array<{ value?: string }> }>;
  };
  blng_sents_part?: {
    'sentence-pair'?: Array<{ sentence?: string; 'sentence-translation'?: string }>;
  };
}

/** 去掉 HTML 标签（如例句里的 <b>）。只匹配真正的标签，保留「<非正式>」这类释义标注。 */
function stripTags(text: string): string {
  return text.replace(/<\/?[a-z][^<>]*>/gi, '').trim();
}

/** 取出 l.i 里的全部文本片段（字符串或 { "#text": … }）。 */
function itemTexts(items: LooseItem[] | string | undefined): string[] {
  const list = typeof items === 'string' ? [items] : (items ?? []);
  return list
    .map(item => (typeof item === 'string' ? item : (item?.['#text'] ?? '')))
    .map(stripTags)
    .filter(Boolean);
}

/** 把 jsonapi 响应解析为统一的 TranslationResult（不抛错；无内容时 translations 为空）。 */
export function parseYoudao(data: YoudaoJsonApi, word: string): TranslationResult {
  const translations: string[] = [];
  let phonetic: string | Phonetic | undefined;

  // 英 → 中：按词性的释义行 + 英/美音标
  const ec = data.ec?.word?.[0];
  if (ec) {
    const ipa: Phonetic = {};
    if (ec.ukphone) ipa.uk = ec.ukphone;
    if (ec.usphone) ipa.us = ec.usphone;
    if (ipa.uk || ipa.us) phonetic = ipa;

    for (const trs of ec.trs ?? []) {
      for (const tr of trs.tr ?? []) {
        translations.push(...itemTexts(tr.l?.i));
      }
    }
  }

  // 中 → 英：每个 tr 是一个英文对应词，合并成一行
  const ce = data.ce?.word?.[0];
  if (ce) {
    const words: string[] = [];
    for (const trs of ce.trs ?? []) {
      for (const tr of trs.tr ?? []) {
        const text = itemTexts(tr.l?.i).join(' ').trim();
        if (text && !words.includes(text)) words.push(text);
      }
    }
    if (words.length > 0) translations.push(words.slice(0, MAX_CE_WORDS).join('; '));

    const pinyin = data.simple?.word?.[0]?.phone;
    if (!phonetic && pinyin) phonetic = pinyin;
  }

  // 机器翻译（仅在词典没有内容时使用）
  const machine = data.fanyi?.tran?.trim();
  if (translations.length === 0 && machine) translations.push(machine);

  // 网络释义：只取「词条本身」那一组；其余分组是相关短语（如 Hello Kitty），不是该词的释义。
  const groups = data.web_trans?.['web-translation'] ?? [];
  const own = groups.find(g => g.key?.trim().toLowerCase() === word.trim().toLowerCase());
  for (const t of (own ?? groups[0])?.trans?.slice(0, MAX_WEB_MEANINGS) ?? []) {
    const value = t.value?.trim();
    if (value) translations.push(`网络${value}`);
  }

  // 双语例句：中文查询时原句是中文、译文是英文，归一为 { en, zh }。
  const examples: Example[] = [];
  for (const pair of data.blng_sents_part?.['sentence-pair'] ?? []) {
    const source = stripTags(pair.sentence ?? '');
    const target = stripTags(pair['sentence-translation'] ?? '');
    if (!source || !target) continue;
    const sourceIsChinese = detectLanguage(source) === 'zh';
    examples.push(sourceIsChinese ? { en: target, zh: source } : { en: source, zh: target });
  }

  return { word, phonetic, translations, examples, pluginName: DISPLAY_NAME };
}

const youdaoPlugin: DictionaryPlugin = {
  displayName: DISPLAY_NAME,

  async translate(text: string, context: TranslateContext): Promise<TranslationResult> {
    const source = context.from === 'auto' ? detectLanguage(text) : context.from;
    if (!isZhEnPair(source, context.to)) {
      throw new MinidictError(
        'UNSUPPORTED',
        `有道词典仅支持中英互译（当前：${source} → ${context.to}）`
      );
    }

    const data = await fetchJson<YoudaoJsonApi>(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(text)}`,
      { headers: { Referer: 'https://dict.youdao.com/' } },
      context
    );

    const result = parseYoudao(data, text);
    if (result.translations.length === 0) {
      // 有道免费接口是词典而非机翻：整句通常查不到，给出明确指引。
      throw new MinidictError(
        'NO_RESULT',
        isSingleWord(text) ? '未找到释义' : '有道词典未收录该短语或句子，可改用 Bing / Google'
      );
    }
    return result;
  }
};

export default youdaoPlugin;

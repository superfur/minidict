import type { Example, Phonetic, TranslationResult } from '../types.js';
import { ERROR_LABELS } from '../errors.js';

/** 一行释义：tag 为词性缩写或「网络」，无 tag 表示普通文本。 */
export interface MeaningRow {
  tag?: string;
  kind: 'pos' | 'web' | 'text';
  text: string;
}

export interface PhoneticPart {
  label?: string;
  value: string;
}

const POS_RE = /^([a-z]+\.)\s*(.+)$/i;
const MAX_WEB_MEANINGS = 6;

/** 折叠文本内部的换行/制表/多余空白，避免源数据破坏布局。 */
export function clean(text: string): string {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 把原始释义数组规整为统一结构的行：
 *   1. 词性释义（int./n./v. …）→ 词性标签 + 释义
 *   2. 网络释义（以「网络」前缀标记）→ 拆分、去重后合并为一行
 *   3. 其它纯文本（如整句译文）→ 原样
 * 各词典经此函数后输出结构一致；卡片与纯文本两种渲染共用。
 */
export function toMeaningRows(translations: string[]): MeaningRow[] {
  const rows: MeaningRow[] = [];
  const web: string[] = [];

  for (const raw of translations ?? []) {
    const text = clean(raw);
    if (!text) continue;

    if (text.startsWith('网络')) {
      const rest = text.replace(/^网络/, '').trim();
      if (rest) web.push(rest);
      continue;
    }

    const match = text.match(POS_RE);
    if (match) {
      rows.push({ tag: match[1].toLowerCase(), kind: 'pos', text: match[2] });
    } else {
      rows.push({ kind: 'text', text });
    }
  }

  if (web.length > 0) {
    const merged = [...new Set(web.flatMap(m => m.split(/[；;]/).map(s => s.trim())))]
      .filter(Boolean)
      .slice(0, MAX_WEB_MEANINGS)
      .join('；');
    if (merged) rows.push({ tag: '网络', kind: 'web', text: merged });
  }

  return rows;
}

export function toPhoneticParts(phonetic?: string | Phonetic): PhoneticPart[] {
  if (!phonetic) return [];
  if (typeof phonetic === 'string') {
    const value = clean(phonetic).replace(/^\[|\]$/g, '');
    return value ? [{ value }] : [];
  }
  const parts: PhoneticPart[] = [];
  if (phonetic.uk) parts.push({ label: '英', value: clean(phonetic.uk) });
  if (phonetic.us) parts.push({ label: '美', value: clean(phonetic.us) });
  return parts;
}

export function limitExamples(examples: Example[] | undefined, maxExamples: number): Example[] {
  const list = (examples ?? [])
    .map(ex => ({ en: clean(ex.en), zh: clean(ex.zh) }))
    .filter(ex => ex.en || ex.zh);
  return maxExamples > 0 ? list.slice(0, maxExamples) : list;
}

/** 失败结果的简短原因标签。优先用结构化错误码；兼容没有错误码的旧式结果。 */
export function errorLabel(result: TranslationResult): string {
  if (result.errorCode) return ERROR_LABELS[result.errorCode];
  const message = result.error ?? '';
  if (message.includes('超时')) return ERROR_LABELS.TIMEOUT;
  if (/HTTP/i.test(message)) return ERROR_LABELS.HTTP;
  return message ? ERROR_LABELS.UNKNOWN : '不可用';
}

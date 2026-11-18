import stringWidth from 'string-width';
import type { TranslationResult } from '../types.js';
import { clean, errorLabel, limitExamples, toMeaningRows, toPhoneticParts } from './model.js';

/** 标签列按显示宽度补齐到 6 列，与卡片输出的对齐方式一致。 */
function padTag(tag: string): string {
  return tag + ' '.repeat(Math.max(1, 6 - stringWidth(tag)));
}

/**
 * 纯文本渲染：无边框、无颜色、不折行，适合管道 / 重定向 / grep。
 *
 *   [Bing] 英 [həˈləʊ]  美 [heˈləʊ]
 *     int.  你好；喂
 *     网络  哈罗；哈啰
 */
export function formatPlainResult(
  result: TranslationResult,
  showPhonetic: boolean = true,
  showExamples: boolean = false,
  maxExamples: number = 3
): string {
  if (result.error) {
    return `[${result.pluginName}] ✗ ${errorLabel(result)}: ${clean(result.error)}`;
  }

  const phonetic = showPhonetic
    ? toPhoneticParts(result.phonetic)
        .map(part => `${part.label ? `${part.label} ` : ''}[${part.value}]`)
        .join('  ')
    : '';

  const lines: string[] = [`[${result.pluginName}]${phonetic ? ` ${phonetic}` : ''}`];

  for (const row of toMeaningRows(result.translations)) {
    lines.push(`  ${row.tag ? padTag(row.tag) : ''}${row.text}`);
  }

  if (showExamples) {
    limitExamples(result.examples, maxExamples).forEach((ex, i) => {
      lines.push(`  ${i + 1}. ${ex.en}`);
      lines.push(`     ${ex.zh}`);
    });
  }

  return lines.join('\n');
}

export interface JsonOutput {
  query: string;
  from: string;
  to: string;
  elapsedMs: number;
  /** 是否至少有一个来源成功 */
  ok: boolean;
  results: TranslationResult[];
}

/** `--json` 输出：结构稳定、可被脚本直接解析。 */
export function formatJson(output: JsonOutput): string {
  return JSON.stringify(output, null, 2);
}

import chalk from 'chalk';
import boxen, { type Options as BoxenOptions } from 'boxen';
import stringWidth from 'string-width';
import type { TranslationResult, Phonetic } from '../types.js';
import { wrapText } from './wrap.js';
import { clean, errorLabel, limitExamples, toMeaningRows, toPhoneticParts } from './model.js';

// POS / 网络 等标签列对齐宽度（按显示列宽计算）
const TAG_COLUMN = 6;

// 仅使用「显示列宽 = 1」且被各终端一致渲染的符号。
// 刻意避开 emoji（🔍🔊⚠）——它们在不同终端/字体下宽度不一致（1 或 2 格），
// 是卡片右边框错位的根因。
export const ICONS = {
  SEARCH: '▸',
  WARNING: '✗',
  OK: '✓'
};

export const COLORS = {
  word: chalk.bold.cyan,
  phonetic: chalk.magenta,
  phoneticLabel: chalk.dim,
  posTag: chalk.bold.cyan,
  netTag: chalk.bold.green,
  translation: chalk.whiteBright,
  netText: chalk.gray,
  pluginName: chalk.bold.yellow,
  exampleTitle: chalk.bold.magenta,
  exampleIndex: chalk.bold.cyan,
  exampleEn: chalk.white,
  exampleZh: chalk.gray,
  marker: chalk.cyan,
  error: chalk.bold.red,
  success: chalk.bold.green,
  dim: chalk.gray,
  bold: chalk.bold
};

/**
 * 统一卡片宽度：随终端自适应，但限制在 [44, 72] 之间，保证各来源卡片轮廓一致。
 * 每次渲染时读取，终端尺寸变化后即时生效。
 */
export function cardWidth(): number {
  const columns = process.stdout.columns || 80;
  return Math.max(44, Math.min(columns - 1, 72));
}

/** 卡片内可用于正文的列数（去掉左右边框与内边距）。 */
function innerWidth(): number {
  return cardWidth() - 4;
}

/** 所有卡片共用的 boxen 配置，确保边框风格、内边距、宽度完全统一。 */
function card(content: string, title?: string): string {
  const opts: BoxenOptions = {
    width: cardWidth(),
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'gray',
    ...(title ? { title: COLORS.pluginName(title), titleAlignment: 'left' as const } : {})
  };
  return boxen(content, opts);
}

/**
 * 带悬挂缩进的折行：首行以 prefix 开头，续行缩进到与正文对齐，
 * 使「词性 / 网络」标签列在长释义换行后依然整齐。
 */
function hanging(prefix: string, text: string, paint: (s: string) => string): string[] {
  const indent = stringWidth(prefix);
  const lines = wrapText(text, innerWidth() - indent);
  return lines.map((line, i) => (i === 0 ? prefix : ' '.repeat(indent)) + paint(line));
}

function padTag(tag: string): string {
  return tag + ' '.repeat(Math.max(1, TAG_COLUMN - stringWidth(tag)));
}

export function formatPhonetic(phonetic?: string | Phonetic): string {
  return toPhoneticParts(phonetic)
    .map(
      part =>
        (part.label ? COLORS.phoneticLabel(`${part.label} `) : '') +
        COLORS.phonetic(`[${part.value}]`)
    )
    .join('  ');
}

function meaningLines(translations: string[]): string[] {
  return toMeaningRows(translations).flatMap(row => {
    if (row.kind === 'text') return hanging('', row.text, COLORS.translation);
    const tag = padTag(row.tag ?? '');
    return row.kind === 'web'
      ? hanging(COLORS.netTag(tag), row.text, COLORS.netText)
      : hanging(COLORS.posTag(tag), row.text, COLORS.translation);
  });
}

function exampleLines(result: TranslationResult, maxExamples: number): string[] {
  const examples = limitExamples(result.examples, maxExamples);
  if (examples.length === 0) return [];

  const lines: string[] = [COLORS.exampleTitle('例句')];
  examples.forEach((ex, i) => {
    const index = `${i + 1}. `;
    const indexed = hanging(index, ex.en, COLORS.exampleEn);
    indexed[0] = COLORS.exampleIndex(index) + indexed[0].slice(index.length);
    lines.push(...indexed);
    lines.push(...hanging(' '.repeat(stringWidth(index)), ex.zh, COLORS.exampleZh));
    if (i < examples.length - 1) lines.push('');
  });
  return lines;
}

/** 查询头：`▸ dict <查询>  en → zh` */
export function formatHeader(word: string, from?: string, to?: string): string {
  const prefix = `${COLORS.marker(ICONS.SEARCH)} ${COLORS.dim('dict')} `;
  const lines = hanging(prefix, clean(word), COLORS.word);
  if (to) {
    lines.push(COLORS.dim(`  ${from && from !== 'auto' ? from : 'auto'} → ${to}`));
  }
  return card(lines.join('\n'));
}

export function formatResult(
  result: TranslationResult,
  showPhonetic: boolean = true,
  showExamples: boolean = false,
  maxExamples: number = 3
): string {
  if (result.error) return formatErrorResult(result);

  const sections: string[][] = [];

  if (showPhonetic) {
    const phonetic = formatPhonetic(result.phonetic);
    if (phonetic) sections.push([phonetic]);
  }

  const meanings = meaningLines(result.translations);
  sections.push(meanings.length > 0 ? meanings : [COLORS.dim('（无释义）')]);

  if (showExamples) {
    const examples = exampleLines(result, maxExamples);
    if (examples.length > 0) sections.push(examples);
  }

  // 各区块之间空一行，结构在各词典间保持一致。
  const content = sections.map(s => s.join('\n')).join('\n\n');
  return card(content, result.pluginName);
}

export function formatErrorResult(result: TranslationResult): string {
  const label = `${ICONS.WARNING} ${errorLabel(result)}`;
  const detail = result.error ? ` · ${clean(result.error)}` : '';
  // 先按纯文本折行，再分段上色：标签加粗红，其余变暗。
  const lines = wrapText(label + detail, innerWidth()).map((line, i) => {
    if (i === 0 && line.startsWith(label)) {
      return COLORS.error(label) + COLORS.dim(line.slice(label.length));
    }
    return COLORS.dim(line);
  });
  return card(lines.join('\n'), result.pluginName);
}

/** 汇总行：`1.1s  Youdao ✓  Bing ✗` */
export function formatSummary(results: TranslationResult[], elapsed?: string): string {
  if (results.length === 0) {
    return card(COLORS.error('未找到任何翻译结果'));
  }

  const status = results.map(result =>
    result.error
      ? COLORS.error(`${result.pluginName} ${ICONS.WARNING}`)
      : COLORS.success(`${result.pluginName} ${ICONS.OK}`)
  );

  const head = elapsed ? COLORS.dim(`${elapsed}s`) + '  ' : '';
  return card(head + status.join('  '));
}

/** 查询结束后的一行新版本提示（非卡片，保持轻量、配色统一）。 */
export function formatUpdateNotice(current: string, latest: string, requiredNode?: string): string {
  const head = COLORS.success('✨ 新版本可用');
  const ver = `${COLORS.dim(current)} ${COLORS.dim('→')} ${COLORS.bold(latest)}`;
  let line = `${head}  ${ver}  ${COLORS.dim('运行')} ${COLORS.word('dict -u')} ${COLORS.dim('升级')}`;
  if (requiredNode) {
    line +=
      '\n' +
      COLORS.error(
        `   ${ICONS.WARNING} 新版本需要 Node >= ${requiredNode}，当前 ${process.version}，请先升级 Node`
      );
  }
  return line;
}

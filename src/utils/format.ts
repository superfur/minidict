import chalk from 'chalk';
import boxen, { type Options as BoxenOptions } from 'boxen';
import stringWidth from 'string-width';
import type { TranslationResult, Phonetic, Example } from '../types.js';

// 统一卡片宽度：随终端自适应，但限制在 [44, 72] 之间，
// 保证三种字典的卡片轮廓完全一致。
const TERM_WIDTH = process.stdout.columns || 80;
const CARD_WIDTH = Math.max(44, Math.min(TERM_WIDTH - 1, 72));
// POS / 网络 等标签列对齐宽度（按显示列宽计算）
const TAG_COLUMN = 6;

// 仅使用「显示列宽 = 1」且被各终端一致渲染的符号。
// 刻意避开 emoji（🔍🔊⚠）——它们在不同终端/字体下宽度不一致（1 或 2 格），
// 是卡片右边框错位的根因。
export const ICONS = {
  SEARCH: '▸',
  WARNING: '✗'
};

export const COLORS = {
  title: chalk.bold.cyan,
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
  border: chalk.gray,
  error: chalk.bold.red,
  success: chalk.bold.green,
  dim: chalk.gray,
  bold: chalk.bold,
  yellow: chalk.yellow
};

/** 所有卡片共用的 boxen 配置，确保边框风格、内边距、宽度完全统一。 */
function card(content: string, title?: string): string {
  const opts: BoxenOptions = {
    width: CARD_WIDTH,
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'gray',
    ...(title ? { title: COLORS.pluginName(title), titleAlignment: 'left' as const } : {})
  };
  return boxen(content, opts);
}

/** 按显示列宽把标签补齐到固定列，使释义文本左对齐。 */
function padTag(tag: string): string {
  const pad = Math.max(1, TAG_COLUMN - stringWidth(tag));
  return tag + ' '.repeat(pad);
}

/** 折叠文本内部的换行/制表/多余空白，避免源数据破坏卡片布局。 */
function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ── 音标 ──────────────────────────────────────────────────────────────

function formatPhoneticInline(phonetic: string | Phonetic): string {
  if (typeof phonetic === 'string') {
    return COLORS.phonetic(`[${phonetic}]`);
  }

  const parts: string[] = [];
  if (phonetic.uk) parts.push(COLORS.phoneticLabel('英 ') + COLORS.phonetic(`[${phonetic.uk}]`));
  if (phonetic.us) parts.push(COLORS.phoneticLabel('美 ') + COLORS.phonetic(`[${phonetic.us}]`));

  return parts.join('  ');
}

export function formatPhonetic(phonetic?: string | Phonetic): string {
  if (!phonetic) return '';
  return formatPhoneticInline(phonetic);
}

// ── 释义 ──────────────────────────────────────────────────────────────

const POS_RE = /^([a-z]+\.)\s*(.+)$/i;

/**
 * 把原始释义数组规整为统一结构的文本行：
 *   1. 词性释义（int./n./v. …）→ 对齐的词性标签 + 释义
 *   2. 网络释义（以「网络」前缀标记，各源已归一）→ 合并为一行「网络  …」
 *   3. 其它纯文本（如 Google 整句翻译）→ 原样展示
 * 三种字典经此函数后输出结构一致。
 */
function formatTranslations(translations: string[]): string[] {
  if (translations.length === 0) return [];

  const lines: string[] = [];
  const netMeanings: string[] = [];

  for (const raw of translations) {
    const t = clean(raw);
    if (!t) continue;

    if (t.startsWith('网络')) {
      const text = t.replace(/^网络/, '').trim();
      if (text) netMeanings.push(text);
      continue;
    }

    const match = t.match(POS_RE);
    if (match) {
      const pos = match[1].toLowerCase();
      lines.push(COLORS.posTag(padTag(pos)) + COLORS.translation(match[2]));
    } else {
      lines.push(COLORS.translation(t));
    }
  }

  if (netMeanings.length > 0) {
    // 合并网络释义为一行：拆分、去重、取前 6 条，保证 Youdao（多条）与 Bing（单条）一致，
    // 也避免过长释义把「网络」标签挤到单独一行。
    const merged = [...new Set(netMeanings.flatMap(m => m.split(/[；;]/).map(s => s.trim())))]
      .filter(Boolean)
      .slice(0, 6)
      .join('；');
    lines.push(COLORS.netTag(padTag('网络')) + COLORS.netText(merged));
  }

  return lines;
}

// ── 例句 ──────────────────────────────────────────────────────────────

function formatExamples(examples: Example[], maxExamples: number): string[] {
  if (!examples || examples.length === 0) return [];

  const lines: string[] = [COLORS.exampleTitle('例句')];
  const limited = examples.slice(0, maxExamples);

  limited.forEach((ex, i) => {
    lines.push(`${COLORS.exampleIndex(`${i + 1}.`)} ${COLORS.exampleEn(clean(ex.en))}`);
    lines.push(`   ${COLORS.exampleZh(clean(ex.zh))}`);
    if (i < limited.length - 1) lines.push('');
  });

  return lines;
}

// ── 对外渲染入口 ───────────────────────────────────────────────────────

export function formatHeader(word: string, phonetic?: string | Phonetic): string {
  const lines: string[] = [
    `${COLORS.marker(ICONS.SEARCH)} ${COLORS.dim('dict')} ${COLORS.word(word)}`
  ];
  if (phonetic) {
    const p = formatPhoneticInline(phonetic);
    if (p) lines.push(p);
  }
  return card(lines.join('\n'));
}

export function formatResult(
  result: TranslationResult,
  showPhonetic: boolean,
  showExamples: boolean,
  maxExamples: number
): string {
  const sections: string[][] = [];

  if (showPhonetic && result.phonetic) {
    const p = formatPhoneticInline(result.phonetic);
    if (p) sections.push([p]);
  }

  const translationLines = formatTranslations(result.translations);
  if (translationLines.length > 0) {
    sections.push(translationLines);
  } else {
    sections.push([COLORS.dim('（无释义）')]);
  }

  if (showExamples && result.examples && result.examples.length > 0) {
    sections.push(formatExamples(result.examples, maxExamples));
  }

  // 各区块之间空一行，结构在三种字典间保持一致。
  const content = sections.map(s => s.join('\n')).join('\n\n');
  return card(content, result.pluginName);
}

export function formatErrorResult(result: TranslationResult): string {
  let reason = '不可用';
  if (result.error) {
    if (result.error.includes('超时')) {
      reason = '连接超时';
    } else if (result.error.includes('HTTP error')) {
      reason = '网络错误';
    } else {
      reason = '请求失败';
    }
  }

  const detail = result.error ? ' · ' + COLORS.dim(result.error) : '';
  const content = `${COLORS.error(ICONS.WARNING + ' ' + reason)}${detail}`;
  return card(content, result.pluginName);
}

export function formatResultCompact(
  result: TranslationResult,
  showPhonetic: boolean,
  showExamples: boolean,
  maxExamples: number
): string {
  return formatResult(result, showPhonetic, showExamples, maxExamples);
}

export function formatError(message: string, pluginName?: string): string {
  return formatErrorResult({
    word: '',
    translations: [],
    pluginName: pluginName || 'unknown',
    error: message
  });
}

export function formatLoading(text: string): string {
  return chalk.cyan(`  ${ICONS.SEARCH} ${text}...`);
}

export function formatSummary(results: TranslationResult[], elapsed?: string): string {
  if (results.length === 0) {
    return card(COLORS.error('未找到任何翻译结果'));
  }

  const statusParts = results.map(result =>
    result.error ? COLORS.error(`${result.pluginName} ✗`) : COLORS.success(`${result.pluginName} ✓`)
  );

  let summary = '';
  if (elapsed) summary += COLORS.dim(`${elapsed}s`) + '  ';
  summary += statusParts.join('  ');

  return card(summary);
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

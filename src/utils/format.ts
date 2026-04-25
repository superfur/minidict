import chalk from 'chalk';
import type { TranslationResult, Phonetic, Example } from '../types.js';

const BOX_WIDTH = 50;
const CONTENT_PAD = 2;
const INNER_WIDTH = BOX_WIDTH - 2 - CONTENT_PAD;

const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

export const ICONS = {
  SEARCH: '🔍',
  SPEAKER: '🔊',
  WARNING: '⚠',
};

export const COLORS = {
  title: chalk.bold.cyan,
  word: chalk.bold.cyan,
  phonetic: chalk.magenta,
  posTag: chalk.bold.blue,
  translation: chalk.white,
  pluginName: chalk.bold.yellow,
  exampleTitle: chalk.bold.cyan,
  exampleIndex: chalk.cyan,
  exampleEn: chalk.blue,
  exampleZh: chalk.gray,
  border: chalk.gray,
  error: chalk.red,
  success: chalk.green,
  dim: chalk.gray,
  bold: chalk.bold,
  yellow: chalk.yellow,
};

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function wrapText(text: string, maxWidth: number): string[] {
  const clean = stripAnsi(text);
  if (clean.length <= maxWidth) return [text];

  const result: string[] = [];
  const ansiRegex = /\x1B\[[0-9;]*m/g;
  let pos = 0;
  let visiblePos = 0;
  let lineStart = 0;
  let lastBreak = 0;
  let lastBreakVisible = 0;

  while (pos < text.length) {
    const match = ansiRegex.exec(text);
    if (match && match.index === pos) {
      pos = match.index + match[0].length;
      continue;
    }

    const ch = text[pos];
    const code = ch.codePointAt(0) || 0;
    const isDouble = code > 0x7f;
    const charWidth = isDouble ? 2 : 1;

    if (ch === ' ' || ch === '；' || ch === '，' || ch === '、') {
      lastBreak = pos;
      lastBreakVisible = visiblePos;
    }

    if (visiblePos + charWidth > maxWidth) {
      if (lastBreakVisible > 0 && (visiblePos - lastBreakVisible) < maxWidth / 2) {
        result.push(text.substring(lineStart, lastBreak).replace(/\s+$/, ''));
        lineStart = text.substring(lastBreak).match(/^\s*/) ? lastBreak + text.substring(lastBreak).match(/^\s*/)![0].length : lastBreak;
      } else {
        result.push(text.substring(lineStart, pos).replace(/\s+$/, ''));
        lineStart = pos;
      }
      visiblePos = 0;
      lastBreakVisible = 0;
      lastBreak = lineStart;
      ansiRegex.lastIndex = lineStart;
      continue;
    }

    visiblePos += charWidth;
    pos++;
  }

  if (lineStart < text.length) {
    result.push(text.substring(lineStart));
  }

  return result;
}

function boxTop(title?: string): string {
  const b = COLORS.border;
  if (title) {
    const coloredTitle = COLORS.pluginName(` ${title} `);
    const titleVisibleLen = stripAnsi(` ${title} `).length;
    const remain = BOX_WIDTH - 2 - titleVisibleLen;
    return b(BOX.topLeft + BOX.horizontal) + coloredTitle + b(BOX.horizontal.repeat(Math.max(0, remain)) + BOX.topRight);
  }
  return b(BOX.topLeft + BOX.horizontal.repeat(BOX_WIDTH - 2) + BOX.topRight);
}

function boxLine(content: string): string {
  const b = COLORS.border;
  const paddedContent = ' ' + content;
  const wrapped = wrapText(paddedContent, INNER_WIDTH);
  return wrapped.map(line => {
    const visibleLen = stripAnsi(line).length;
    const padding = Math.max(0, INNER_WIDTH - visibleLen);
    return b(BOX.vertical) + ' ' + line + ' '.repeat(padding) + ' ' + b(BOX.vertical);
  }).join('\n');
}

function boxEmptyLine(): string {
  const b = COLORS.border;
  return b(BOX.vertical + ' '.repeat(BOX_WIDTH - 2) + BOX.vertical);
}

function boxBottom(): string {
  const b = COLORS.border;
  return b(BOX.bottomLeft + BOX.horizontal.repeat(BOX_WIDTH - 2) + BOX.bottomRight);
}

export function formatHeader(word: string, phonetic?: string | Phonetic): string {
  const lines: string[] = [];

  lines.push(boxTop());

  const headerText = `${ICONS.SEARCH} dict ${COLORS.word(word)}`;
  const wrapped = wrapText(headerText, INNER_WIDTH);
  for (const line of wrapped) {
    const visibleLen = stripAnsi(line).length;
    const padding = Math.max(0, INNER_WIDTH - visibleLen);
    lines.push(COLORS.border(BOX.vertical) + ' ' + line + ' '.repeat(padding) + ' ' + COLORS.border(BOX.vertical));
  }

  if (phonetic) {
    const phoneticText = formatPhoneticInline(phonetic);
    if (phoneticText) {
      const pWrapped = wrapText(phoneticText, INNER_WIDTH);
      for (const line of pWrapped) {
        const visibleLen = stripAnsi(line).length;
        const padding = Math.max(0, INNER_WIDTH - visibleLen);
        lines.push(COLORS.border(BOX.vertical) + ' ' + line + ' '.repeat(padding) + ' ' + COLORS.border(BOX.vertical));
      }
    }
  }

  lines.push(boxBottom());

  return lines.join('\n');
}

function formatPhoneticInline(phonetic: string | Phonetic): string {
  if (typeof phonetic === 'string') {
    return `${ICONS.SPEAKER} ${COLORS.phonetic(`[${phonetic}]`)}`;
  }

  const parts: string[] = [];
  if (phonetic.uk) {
    parts.push(COLORS.phonetic(`英 [${phonetic.uk}]`));
  }
  if (phonetic.us) {
    parts.push(COLORS.phonetic(`美 [${phonetic.us}]`));
  }

  if (parts.length > 0) {
    return `${ICONS.SPEAKER} ${parts.join('  ')}`;
  }
  return '';
}

export function formatPhonetic(phonetic?: string | Phonetic): string {
  if (!phonetic) return '';
  return formatPhoneticInline(phonetic);
}

function formatTranslations(translations: string[]): string[] {
  if (translations.length === 0) return [];

  return translations.map(t => {
    if (t.startsWith('网络')) {
      return COLORS.dim('·  ' + t.replace('网络', '').trim());
    }

    const match = t.match(/^([a-z]+\.)\s*(.+)$/i);
    if (match) {
      const pos = match[1];
      const text = match[2];
      const posColored = COLORS.posTag(pos);
      const posVisibleLen = pos.length;
      const padLen = 6 - posVisibleLen;
      return posColored + ' '.repeat(padLen) + COLORS.translation(text);
    }

    return COLORS.translation(t);
  });
}

function formatExamples(examples: Example[], maxExamples: number): string[] {
  if (!examples || examples.length === 0) return [];

  const lines: string[] = [];
  const limited = examples.slice(0, maxExamples);

  lines.push(COLORS.exampleTitle('例句'));

  limited.forEach((ex, i) => {
    lines.push(`  ${COLORS.exampleIndex(`${i + 1}.`)}  ${COLORS.exampleEn(ex.en)}`);
    lines.push(`      ${COLORS.exampleZh(ex.zh)}`);
    if (i < limited.length - 1) {
      lines.push('');
    }
  });

  return lines;
}

export function formatResult(result: TranslationResult, showPhonetic: boolean, showExamples: boolean, maxExamples: number): string {
  const lines: string[] = [];

  lines.push(boxTop(result.pluginName));
  lines.push(boxEmptyLine());

  const translationLines = formatTranslations(result.translations);
  for (const tl of translationLines) {
    lines.push(boxLine(tl));
  }

  if (showExamples && result.examples && result.examples.length > 0) {
    lines.push(boxEmptyLine());
    const exampleLines = formatExamples(result.examples, maxExamples);
    for (const el of exampleLines) {
      lines.push(boxLine(el));
    }
  }

  lines.push(boxEmptyLine());
  lines.push(boxBottom());

  return lines.join('\n');
}

export function formatErrorResult(result: TranslationResult): string {
  const lines: string[] = [];

  lines.push(boxTop(result.pluginName));
  lines.push(boxEmptyLine());

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

  const errorLine = `${ICONS.WARNING} ${COLORS.error(reason)}${result.error ? ' · ' + COLORS.dim(result.error) : ''}`;
  lines.push(boxLine(errorLine));
  lines.push(boxEmptyLine());
  lines.push(boxBottom());

  return lines.join('\n');
}

export function formatResultCompact(result: TranslationResult, showPhonetic: boolean, showExamples: boolean, maxExamples: number): string {
  return formatResult(result, showPhonetic, showExamples, maxExamples);
}

export function formatError(message: string, pluginName?: string): string {
  return formatErrorResult({
    word: '',
    translations: [],
    pluginName: pluginName || 'unknown',
    error: message,
  });
}

export function formatLoading(text: string): string {
  return chalk.cyan(`  ${ICONS.SPEAKER} ${text}...`);
}

export function formatSummary(results: TranslationResult[], elapsed?: string): string {
  const lines: string[] = [];

  if (results.length === 0) {
    lines.push(boxTop());
    lines.push(boxLine(COLORS.error('未找到任何翻译结果')));
    lines.push(boxBottom());
    return lines.join('\n');
  }

  const statusParts: string[] = [];
  for (const result of results) {
    if (result.error) {
      statusParts.push(`${COLORS.error(result.pluginName + ' ✗')}`);
    } else {
      statusParts.push(`${COLORS.success(result.pluginName + ' ✓')}`);
    }
  }

  let summary = '';
  if (elapsed) {
    summary += COLORS.dim(`${elapsed}s`) + '  ';
  }
  summary += statusParts.join('  ');

  lines.push('');
  lines.push(boxTop());
  lines.push(boxLine(summary));
  lines.push(boxBottom());

  return lines.join('\n');
}

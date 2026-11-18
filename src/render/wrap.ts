import stringWidth from 'string-width';

// 不能出现在行首的标点（避头）与不能出现在行尾的标点（避尾）。
const NO_LINE_START = new Set('，。；：、！？）》」』】〉”’,.;:!?)]}%…');
const NO_LINE_END = new Set('（《「『【〈“‘([{');

/**
 * 把文本切成不可再分的片段：
 *   - 连续的非空白窄字符（英文单词、数字）为一个片段；
 *   - 每个宽字符（CJK）单独成片段，可在任意两个汉字之间断行；
 *   - 避头标点并入前一片段，避尾标点并入后一片段。
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let word = '';
  let prefix = '';

  const push = (token: string): void => {
    tokens.push(prefix + token);
    prefix = '';
  };
  const flush = (): void => {
    if (word) {
      push(word);
      word = '';
    }
  };

  for (const ch of text) {
    if (ch === ' ') {
      flush();
      tokens.push(' ');
    } else if (NO_LINE_START.has(ch)) {
      flush();
      const last = tokens.length - 1;
      if (last >= 0 && tokens[last] !== ' ') tokens[last] += ch;
      else push(ch);
    } else if (NO_LINE_END.has(ch)) {
      flush();
      prefix += ch;
    } else if (stringWidth(ch) >= 2) {
      flush();
      push(ch);
    } else {
      word += ch;
    }
  }
  flush();
  if (prefix) tokens.push(prefix);
  return tokens;
}

/** 把超过整行宽度的片段按显示宽度硬切。 */
function hardSplit(token: string, width: number): string[] {
  const parts: string[] = [];
  let current = '';
  for (const ch of token) {
    if (current && stringWidth(current + ch) > width) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * 按「显示列宽」折行（正确处理中英文混排与全角字符），返回各行文本。
 * 输入应为不含 ANSI 颜色码的纯文本——颜色在折行之后按行添加。
 */
export function wrapText(text: string, width: number): string[] {
  const max = Math.max(4, width);
  const lines: string[] = [];
  let line = '';

  const commit = (): void => {
    lines.push(line.trimEnd());
    line = '';
  };

  for (const token of tokenize(text)) {
    if (token === ' ') {
      // 行首不留空格
      if (line) line += ' ';
      continue;
    }
    if (stringWidth(line + token) <= max) {
      line += token;
      continue;
    }
    if (line.trim()) commit();
    line = '';
    if (stringWidth(token) <= max) {
      line = token;
    } else {
      const parts = hardSplit(token, max);
      lines.push(...parts.slice(0, -1));
      line = parts[parts.length - 1] ?? '';
    }
  }
  if (line.trim()) commit();
  return lines.length > 0 ? lines : [''];
}

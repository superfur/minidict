import stringWidth from 'string-width';
import {
  formatResult,
  formatErrorResult,
  formatHeader,
  formatSummary
} from '../src/render/card.js';
import { formatPlainResult, formatJson } from '../src/render/plain.js';
import { toMeaningRows, toPhoneticParts, errorLabel } from '../src/render/model.js';
import { wrapText } from '../src/render/wrap.js';
import type { TranslationResult } from '../src/types.js';
import { strip } from './helpers.js';

const base: TranslationResult = {
  word: 'hello',
  phonetic: { uk: 'həˈləʊ', us: 'heˈləʊ' },
  translations: ['int. 你好', '网络哈罗；哈啰', '网络哈啰；大家好'],
  examples: [
    { en: 'Hello, world.', zh: '你好，世界。' },
    { en: 'Say hello to her.', zh: '向她问好。' }
  ],
  pluginName: 'Bing'
};

describe('wrapText', () => {
  it('never exceeds the display width, for CJK and mixed text', () => {
    const text =
      '喂，你好（用于问候或打招呼）；喂，你好（打电话时的招呼语）；a fairly long English sentence follows here';
    for (const width of [10, 20, 33, 66]) {
      for (const line of wrapText(text, width)) {
        expect(stringWidth(line)).toBeLessThanOrEqual(width);
      }
    }
  });

  it('does not start a line with closing punctuation', () => {
    const lines = wrapText('一二三四五，六七八九十。一二三四五；六七八九十', 10);
    for (const line of lines) {
      expect(line).not.toMatch(/^[，。；：、）]/);
    }
  });

  it('keeps English words intact and drops leading spaces', () => {
    const lines = wrapText('alpha beta gamma delta', 11);
    expect(lines).toEqual(['alpha beta', 'gamma delta']);
  });

  it('hard-splits a token longer than the width and preserves all characters', () => {
    const lines = wrapText('a'.repeat(25), 10);
    expect(lines.join('')).toBe('a'.repeat(25));
    expect(Math.max(...lines.map(l => l.length))).toBeLessThanOrEqual(10);
  });

  it('returns a single empty line for empty input', () => {
    expect(wrapText('', 20)).toEqual(['']);
  });
});

describe('render model', () => {
  it('splits pos / text rows and merges de-duplicated web meanings into one row', () => {
    expect(toMeaningRows(base.translations)).toEqual([
      { tag: 'int.', kind: 'pos', text: '你好' },
      { tag: '网络', kind: 'web', text: '哈罗；哈啰；大家好' }
    ]);
    expect(toMeaningRows(['我爱你'])).toEqual([{ kind: 'text', text: '我爱你' }]);
  });

  it('normalizes phonetics', () => {
    expect(toPhoneticParts({ uk: 'a', us: 'b' })).toEqual([
      { label: '英', value: 'a' },
      { label: '美', value: 'b' }
    ]);
    expect(toPhoneticParts('[nǐ hǎo]')).toEqual([{ value: 'nǐ hǎo' }]);
    expect(toPhoneticParts(undefined)).toEqual([]);
  });

  it('labels errors by code, with a string fallback for legacy results', () => {
    const r = (extra: Partial<TranslationResult>): TranslationResult => ({
      word: 'x',
      translations: [],
      pluginName: 'X',
      ...extra
    });
    expect(errorLabel(r({ error: 'e', errorCode: 'RATE_LIMIT' }))).toBe('请求过于频繁');
    expect(errorLabel(r({ error: 'e', errorCode: 'NO_RESULT' }))).toBe('无结果');
    expect(errorLabel(r({ error: '请求超时 (10ms)' }))).toBe('连接超时');
    expect(errorLabel(r({ error: 'HTTP error! status: 503' }))).toBe('网络错误');
    expect(errorLabel(r({ error: '别的问题' }))).toBe('请求失败');
  });
});

describe('card renderer', () => {
  it('renders translations and plugin name', () => {
    const out = strip(formatResult(base, false, false, 3));
    expect(out).toMatch(/Bing/);
    expect(out).toMatch(/你好/);
  });

  it('renders phonetic only when showPhonetic is true', () => {
    expect(strip(formatResult(base, true, false, 3))).toMatch(/həˈləʊ/);
    expect(strip(formatResult(base, false, false, 3))).not.toMatch(/həˈləʊ/);
  });

  it('renders examples only when asked, limited to maxExamples', () => {
    expect(strip(formatResult(base, true, false, 3))).not.toMatch(/Hello, world/);
    const out = strip(formatResult(base, true, true, 1));
    expect(out).toMatch(/Hello, world/);
    expect(out).not.toMatch(/Say hello/);
  });

  it('keeps every line of a long card exactly the same display width', () => {
    const long: TranslationResult = {
      ...base,
      translations: [
        'int. 喂，你好（用于问候或打招呼）；喂，你好（打电话时的招呼语）；喂，你好（引起别人注意的招呼语）；<非正式>喂，嘿 (认为别人说了蠢话或分心)',
        '网络冰淇淋；雪糕；各式口味冰激凌；冰激凌；冰淇淋三明治；冰激凌三明治；还有更多更多的释义'
      ]
    };
    const lines = strip(formatResult(long, true, true, 3)).split('\n');
    const widths = new Set(lines.map(l => stringWidth(l)));
    expect(widths.size).toBe(1);
    // 续行悬挂缩进：换行后的释义与首行正文对齐，「网络」标签不会单独占一行
    expect(lines.some(l => /^│ 网络\s+\S/.test(l))).toBe(true);
    expect(lines.some(l => /^│ {7}\S/.test(l))).toBe(true);
  });

  it('renders error results through formatResult as an error card', () => {
    const out = strip(
      formatResult({
        word: 'x',
        translations: [],
        pluginName: 'Bing',
        error: '未找到释义',
        errorCode: 'NO_RESULT'
      })
    );
    expect(out).toMatch(/✗ 无结果 · 未找到释义/);
  });

  it('formatErrorResult shows the label and the detail', () => {
    const out = strip(
      formatErrorResult({
        word: 'x',
        translations: [],
        pluginName: 'Google',
        error: 'HTTP 503',
        errorCode: 'HTTP'
      })
    );
    expect(out).toMatch(/Google/);
    expect(out).toMatch(/网络错误 · HTTP 503/);
  });

  it('header includes the query and the language direction', () => {
    const out = strip(formatHeader('serendipity', 'auto', 'zh'));
    expect(out).toMatch(/serendipity/);
    expect(out).toMatch(/auto → zh/);
  });

  it('summary marks success and failure per source', () => {
    const out = strip(
      formatSummary(
        [base, { word: 'x', translations: [], pluginName: 'Google', error: 'e' }],
        '1.2'
      )
    );
    expect(out).toMatch(/1\.2s/);
    expect(out).toMatch(/Bing ✓/);
    expect(out).toMatch(/Google ✗/);
  });
});

describe('plain renderer', () => {
  it('prints an unboxed, uncoloured block', () => {
    const out = formatPlainResult(base, true, true, 1);
    expect(out).toBe(
      [
        '[Bing] 英 [həˈləʊ]  美 [heˈləʊ]',
        '  int.  你好',
        '  网络  哈罗；哈啰；大家好',
        '  1. Hello, world.',
        '     你好，世界。'
      ].join('\n')
    );
  });

  it('prints errors on one line', () => {
    const out = formatPlainResult({
      word: 'x',
      translations: [],
      pluginName: 'Google',
      error: '请求超时 (10ms)',
      errorCode: 'TIMEOUT'
    });
    expect(out).toBe('[Google] ✗ 连接超时: 请求超时 (10ms)');
  });

  it('formatJson round-trips', () => {
    const payload = {
      query: 'hello',
      from: 'auto',
      to: 'zh',
      elapsedMs: 12,
      ok: true,
      results: [base]
    };
    expect(JSON.parse(formatJson(payload))).toEqual(payload);
  });
});

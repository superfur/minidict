import { formatResult, formatErrorResult, formatHeader } from '../src/utils/format.js';
import type { TranslationResult } from '../src/types.js';

function strip(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}

describe('formatErrorResult', () => {
  function reasonFor(error: string): string {
    return strip(formatErrorResult({ word: 'x', translations: [], pluginName: 'Bing', error }));
  }

  it('maps timeout errors to 连接超时', () => {
    expect(reasonFor('请求超时 (10000ms)')).toMatch(/连接超时/);
  });

  it('maps HTTP errors to 网络错误', () => {
    expect(reasonFor('HTTP error! status: 503')).toMatch(/网络错误/);
  });

  it('maps other errors to 请求失败', () => {
    expect(reasonFor('解析 API 响应失败')).toMatch(/请求失败/);
  });
});

describe('formatResult', () => {
  const base: TranslationResult = {
    word: 'hello',
    phonetic: { uk: 'həˈləʊ', us: 'heˈləʊ' },
    translations: ['int. 你好'],
    examples: [],
    pluginName: 'Bing'
  };

  it('renders translations and plugin name', () => {
    const out = strip(formatResult(base, false, false, 3));
    expect(out).toMatch(/Bing/);
    expect(out).toMatch(/你好/);
  });

  it('renders phonetic only when showPhonetic is true', () => {
    expect(strip(formatResult(base, true, false, 3))).toMatch(/həˈləʊ/);
    expect(strip(formatResult(base, false, false, 3))).not.toMatch(/həˈləʊ/);
  });
});

describe('formatHeader', () => {
  it('includes the queried word', () => {
    expect(strip(formatHeader('serendipity'))).toMatch(/serendipity/);
  });
});

import fs from 'fs';
import path from 'path';
import youdao, { parseYoudao } from '../src/plugins/youdao/index.js';
import google, {
  parseGoogleResponse,
  parseGoogleFallback,
  toGoogleLang
} from '../src/plugins/google/index.js';
import bing, { toBingLang } from '../src/plugins/bing/index.js';
import { derivePluginName, buildRegistry } from '../src/plugins/index.js';
import type { TranslateContext } from '../src/types.js';
import { fetchMock, queueResponses } from './helpers.js';

function fixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test/fixtures', name), 'utf-8'));
}

const ctx = (extra: Partial<TranslateContext> = {}): TranslateContext => ({
  from: 'auto',
  to: 'zh',
  timeout: 1000,
  ...extra
});

/** 取第 n 次（从 0 起）请求的 URL。 */
function requestedUrl(n: number = 0): string {
  return String(fetchMock.mock.calls[n][0]);
}

beforeEach(() => {
  fetchMock.mockClear();
});

describe('youdao parser', () => {
  it('parses an English word: phonetics, pos meanings, web meanings, examples', () => {
    const result = parseYoudao(fixture('youdao-hello.json') as never, 'hello');
    expect(result.phonetic).toEqual({ uk: 'həˈləʊ', us: 'həˈloʊ' });
    expect(result.translations[0]).toMatch(/^int\. /);
    expect(result.translations.some(t => t.startsWith('n. '))).toBe(true);
    const web = result.translations.filter(t => t.startsWith('网络'));
    expect(web.length).toBeGreaterThan(0);
    expect(web.length).toBeLessThanOrEqual(6);
    expect(result.examples?.length).toBeGreaterThan(0);
    for (const ex of result.examples ?? []) {
      expect(ex.en).not.toMatch(/<[^>]+>/);
      expect(ex.zh).toMatch(/[\u4e00-\u9fff]/);
    }
  });

  it('only uses the web meanings of the entry itself, not of related phrases', () => {
    const result = parseYoudao(
      {
        web_trans: {
          'web-translation': [
            { key: 'Hello', trans: [{ value: '您好' }] },
            { key: 'Hello Kitty', trans: [{ value: '凯蒂猫' }] }
          ]
        }
      },
      'hello'
    );
    expect(result.translations).toEqual(['网络您好']);
  });

  it('parses a Chinese word into English equivalents with examples as { en, zh }', () => {
    const result = parseYoudao(fixture('youdao-zh.json') as never, '苹果');
    expect(result.translations[0]).toMatch(/apple/i);
    for (const ex of result.examples ?? []) {
      expect(ex.zh).toMatch(/[\u4e00-\u9fff]/);
      expect(ex.en).not.toMatch(/[\u4e00-\u9fff]/);
    }
  });

  it('parses a phrase', () => {
    const result = parseYoudao(fixture('youdao-phrase.json') as never, 'I love you');
    expect(result.translations.join(' ')).toMatch(/我爱你/);
  });

  it('strips HTML tags but keeps usage labels such as <非正式>', () => {
    const result = parseYoudao(
      {
        ec: { word: [{ trs: [{ tr: [{ l: { i: ['int. <非正式>喂，<b>嘿</b>'] } }] }] }] }
      },
      'hello'
    );
    expect(result.translations).toEqual(['int. <非正式>喂，嘿']);
  });

  it('returns no translations for an empty response', () => {
    expect(parseYoudao({}, 'asdfqwer').translations).toEqual([]);
  });
});

describe('youdao plugin', () => {
  it('rejects language pairs other than zh <-> en without any request', async () => {
    await expect(youdao.translate('こんにちは', ctx())).rejects.toMatchObject({
      code: 'UNSUPPORTED'
    });
    await expect(youdao.translate('hello', ctx({ to: 'ja' }))).rejects.toMatchObject({
      code: 'UNSUPPORTED'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns an empty dictionary response into NO_RESULT', async () => {
    queueResponses({ body: { meta: {} } });
    await expect(youdao.translate('asdfqwer', ctx())).rejects.toMatchObject({ code: 'NO_RESULT' });
    queueResponses({ body: { meta: {} } });
    await expect(youdao.translate('a whole long sentence', ctx())).rejects.toThrow(
      /Bing \/ Google/
    );
  });

  it('returns the parsed result', async () => {
    queueResponses({ body: fixture('youdao-hello.json') });
    const result = await youdao.translate('hello', ctx());
    expect(result.pluginName).toBe('Youdao');
    expect(requestedUrl()).toContain('dict.youdao.com/jsonapi?q=hello');
  });
});

describe('google parser', () => {
  const sample = [
    [
      ['你好', 'hello', null, null, 10],
      [null, null, 'Nǐ hǎo', 'həˈlō']
    ],
    [['interjection', ['你好!', '喂!'], [], 'Hello!', 9]],
    'en'
  ];

  it('extracts translation, source phonetic and pos rows', () => {
    const result = parseGoogleResponse(sample, 'hello');
    expect(result.translations).toEqual(['你好', 'int. 你好!；喂!']);
    // 取源词音标，而不是译文的转写（Nǐ hǎo）
    expect(result.phonetic).toBe('həˈlō');
  });

  it('joins multi-segment sentences', () => {
    const data = [
      [
        ['我爱你。', 'I love you.'],
        ['今天天气很好。', 'It is nice today.']
      ]
    ];
    expect(parseGoogleResponse(data, 'x').translations).toEqual(['我爱你。今天天气很好。']);
  });

  it('throws NO_RESULT on an empty / malformed payload', () => {
    expect(() => parseGoogleResponse([null], 'x')).toThrow(/未获取到/);
    expect(() => parseGoogleResponse({}, 'x')).toThrow(/未获取到/);
  });

  it('treats an echoed input (untranslatable text) as NO_RESULT', () => {
    expect(() => parseGoogleResponse([[['Asdfqwer', 'asdfqwer']]], 'asdfqwer')).toThrow(/未获取到/);
    expect(() => parseGoogleFallback([['asdfqwer', 'en']], 'asdfqwer')).toThrow(/未获取到/);
  });

  it('parses both shapes of the fallback endpoint', () => {
    expect(parseGoogleFallback([['你好', 'en']], 'hello').translations).toEqual(['你好']);
    expect(parseGoogleFallback(['你好'], 'hello').translations).toEqual(['你好']);
    expect(() => parseGoogleFallback([], 'hello')).toThrow();
  });

  it('maps language codes', () => {
    expect(toGoogleLang('zh')).toBe('zh-CN');
    expect(toGoogleLang('zh-TW')).toBe('zh-TW');
    expect(toGoogleLang('ja')).toBe('ja');
  });
});

describe('google plugin', () => {
  it('sends the language pair', async () => {
    queueResponses({ body: [[['こんにちは', 'hello']]] });
    await google.translate('hello', ctx({ from: 'en', to: 'ja' }));
    expect(requestedUrl()).toMatch(/sl=en&tl=ja/);
  });

  it('falls back to the secondary endpoint when rate limited', async () => {
    queueResponses({ body: 'too many', status: 429 }, { body: [['你好', 'en']] });
    const result = await google.translate('hello', ctx());
    expect(result.translations).toEqual(['你好']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrl(1)).toContain('clients5.google.com');
  });

  it('does not fall back on a network failure', async () => {
    // 默认 mock 抛错 → 两次尝试（1 次重试）后以 NETWORK 失败，不再请求备用接口
    await expect(google.translate('hello', ctx())).rejects.toMatchObject({ code: 'NETWORK' });
    expect(fetchMock.mock.calls.every(c => String(c[0]).includes('translate.googleapis.com'))).toBe(
      true
    );
  });
});

describe('bing plugin routing', () => {
  it('maps language codes', () => {
    expect(toBingLang('auto')).toBe('auto-detect');
    expect(toBingLang('zh')).toBe('zh-Hans');
    expect(toBingLang('zh-TW')).toBe('zh-Hant');
    expect(toBingLang('fr')).toBe('fr');
  });

  it('looks up single zh/en words on the dictionary page', async () => {
    queueResponses({
      body: fs.readFileSync(path.join(process.cwd(), 'test/fixtures/bing-hello.html'), 'utf-8')
    });
    const result = await bing.translate('hello', ctx());
    expect(requestedUrl()).toContain('cn.bing.com/dict/search?q=hello');
    expect(result.word).toBe('hello');
    expect(result.translations.length).toBeGreaterThan(0);
  });

  it('routes sentences and other languages to the translator', async () => {
    for (const [text, context] of [
      ['I love you', ctx()],
      ['こんにちは', ctx()],
      ['hello', ctx({ to: 'ja' })]
    ] as const) {
      fetchMock.mockClear();
      queueResponses({ body: '<html>no token here</html>' });
      await expect(bing.translate(text, context)).rejects.toMatchObject({ code: 'PARSE' });
      expect(requestedUrl()).toBe('https://www.bing.com/translator');
    }
  });
});

describe('plugin registry', () => {
  it('derives plugin names from module specifiers', () => {
    expect(derivePluginName('minidict-openai')).toBe('openai');
    expect(derivePluginName('/path/to/minidict-foo.mjs')).toBe('foo');
    expect(derivePluginName('C:\\plugins\\Bar.js')).toBe('bar');
    expect(derivePluginName('@scope/minidict-baz')).toBe('baz');
  });

  it('records why an external plugin failed to load', async () => {
    const registry = await buildRegistry(['/definitely/not/a/real/minidict-ghost.mjs']);
    expect(Object.keys(registry.plugins).sort()).toEqual(['bing', 'google', 'youdao']);
    expect(registry.loadErrors.ghost).toBeTruthy();
  });
});

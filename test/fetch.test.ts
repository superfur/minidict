import { fetchJson, fetchText, fetchWithProxy, shouldBypassProxy } from '../src/utils/fetch.js';
import { detectLanguage, normalizeLang, resolveLanguages, isZhEnPair } from '../src/lang.js';
import { fakeResponse, fetchMock, queueResponses } from './helpers.js';

beforeEach(() => {
  fetchMock.mockClear();
});

describe('request helpers', () => {
  it('returns text / parsed JSON on success and sends default headers', async () => {
    queueResponses({ body: 'hi' }, { body: { a: 1 } });
    expect(await fetchText('https://example.com/a')).toBe('hi');
    expect(await fetchJson('https://example.com/b', { headers: { Referer: 'r' } })).toEqual({
      a: 1
    });
    const headers = fetchMock.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/Mozilla/);
    expect(headers.Referer).toBe('r');
  });

  it('maps HTTP status codes to structured errors without retrying', async () => {
    queueResponses({ body: '', status: 429 });
    await expect(fetchText('https://example.com')).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      status: 429
    });
    queueResponses({ body: '', status: 503 });
    await expect(fetchText('https://example.com')).rejects.toMatchObject({
      code: 'HTTP',
      status: 503
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports invalid JSON as PARSE', async () => {
    queueResponses({ body: '<html>' });
    await expect(fetchJson('https://example.com')).rejects.toMatchObject({ code: 'PARSE' });
  });

  it('retries a transient network error once, then succeeds', async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('ECONNRESET');
    });
    queueResponses({ body: 'ok' });
    expect(await fetchText('https://example.com')).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up with NETWORK after the retries are exhausted', async () => {
    await expect(fetchText('https://example.com', {}, { retries: 0 })).rejects.toMatchObject({
      code: 'NETWORK'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times out (covering the body read) and does not retry', async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );
    await expect(fetchText('https://example.com', {}, { timeout: 30 })).rejects.toMatchObject({
      code: 'TIMEOUT'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetchWithProxy returns the raw response without checking status', async () => {
    fetchMock.mockImplementationOnce(async () => fakeResponse('nope', 404));
    const response = await fetchWithProxy('https://example.com');
    expect(response.status).toBe(404);
  });
});

describe('shouldBypassProxy (NO_PROXY)', () => {
  it('matches exact hosts, suffixes and wildcards', () => {
    expect(shouldBypassProxy('https://dict.youdao.com/x', 'youdao.com')).toBe(true);
    expect(shouldBypassProxy('https://dict.youdao.com/x', '.youdao.com')).toBe(true);
    expect(shouldBypassProxy('https://dict.youdao.com/x', '*.youdao.com')).toBe(true);
    expect(shouldBypassProxy('https://dict.youdao.com/x', 'localhost, dict.youdao.com')).toBe(true);
    expect(shouldBypassProxy('https://www.bing.com/', '*')).toBe(true);
  });

  it('does not match unrelated hosts or partial names', () => {
    expect(shouldBypassProxy('https://www.bing.com/', 'youdao.com')).toBe(false);
    expect(shouldBypassProxy('https://notyoudao.com/', 'youdao.com')).toBe(false);
    expect(shouldBypassProxy('https://www.bing.com/', '')).toBe(false);
  });

  it('honours an optional port', () => {
    expect(shouldBypassProxy('https://a.com/', 'a.com:443')).toBe(true);
    expect(shouldBypassProxy('https://a.com/', 'a.com:8443')).toBe(false);
  });
});

describe('language helpers', () => {
  it('detects by script', () => {
    expect(detectLanguage('hello')).toBe('en');
    expect(detectLanguage('你好')).toBe('zh');
    expect(detectLanguage('こんにちは')).toBe('ja');
    expect(detectLanguage('日本語を勉強する')).toBe('ja');
    expect(detectLanguage('안녕하세요')).toBe('ko');
    expect(detectLanguage('привет')).toBe('ru');
  });

  it('normalizes codes and aliases', () => {
    expect(normalizeLang(undefined)).toBe('auto');
    expect(normalizeLang(' ZH-CN ')).toBe('zh');
    expect(normalizeLang('zh-Hant')).toBe('zh-TW');
    expect(normalizeLang('jp')).toBe('ja');
    expect(normalizeLang('FR')).toBe('fr');
  });

  it('picks the target language automatically', () => {
    expect(resolveLanguages('hello')).toEqual({ from: 'auto', to: 'zh', source: 'en' });
    expect(resolveLanguages('你好')).toEqual({ from: 'auto', to: 'en', source: 'zh' });
    expect(resolveLanguages('こんにちは')).toEqual({ from: 'auto', to: 'zh', source: 'ja' });
    expect(resolveLanguages('bonjour', 'fr', 'en')).toEqual({ from: 'fr', to: 'en', source: 'fr' });
    expect(resolveLanguages('hello', undefined, 'ja').to).toBe('ja');
  });

  it('knows which pairs the dictionaries support', () => {
    expect(isZhEnPair('en', 'zh')).toBe(true);
    expect(isZhEnPair('zh', 'en')).toBe(true);
    expect(isZhEnPair('ja', 'zh')).toBe(false);
    expect(isZhEnPair('en', 'en')).toBe(false);
  });
});

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  getCached,
  setCached,
  clearCache,
  pruneCache,
  normalizeQuery
} from '../src/utils/cache.js';
import type { TranslationResult } from '../src/types.js';

const TMP_DIR = path.join(os.tmpdir(), 'minidict-cache-test');

const sample: TranslationResult = {
  word: 'hello',
  translations: ['你好'],
  examples: [],
  pluginName: 'Youdao'
};

beforeAll(() => {
  process.env.MINIDICT_CACHE_DIR = TMP_DIR;
});

beforeEach(async () => {
  await clearCache();
});

afterAll(async () => {
  await clearCache();
  delete process.env.MINIDICT_CACHE_DIR;
});

describe('cache', () => {
  it('round-trips a stored result within TTL', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    const got = await getCached({ plugin: 'youdao', text: 'hello' }, 60_000);
    expect(got).toEqual(sample);
  });

  it('returns undefined for a miss', async () => {
    expect(await getCached({ plugin: 'youdao', text: 'never-queried' }, 60_000)).toBeUndefined();
  });

  it('treats expired entries as a miss', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    // ttl = 0 → 任何已存条目都视为过期
    expect(await getCached({ plugin: 'youdao', text: 'hello' }, 0)).toBeUndefined();
  });

  it('does not cache error results', async () => {
    await setCached({ plugin: 'bing', text: 'hello' }, { ...sample, error: '请求超时 (10000ms)' });
    expect(await getCached({ plugin: 'bing', text: 'hello' }, 60_000)).toBeUndefined();
  });

  it('does not cache results without any translation', async () => {
    await setCached(
      { plugin: 'bing', text: 'empty' },
      { word: 'empty', translations: [], pluginName: 'Bing' }
    );
    expect(await getCached({ plugin: 'bing', text: 'empty' }, 60_000)).toBeUndefined();
  });

  it('namespaces by plugin', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    expect(await getCached({ plugin: 'bing', text: 'hello' }, 60_000)).toBeUndefined();
  });

  it('clearCache removes stored entries', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    await clearCache();
    expect(await getCached({ plugin: 'youdao', text: 'hello' }, 60_000)).toBeUndefined();
  });

  it('tolerates a corrupt cache file (returns miss)', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    const files = await fs.readdir(TMP_DIR);
    await fs.writeFile(path.join(TMP_DIR, files[0]), 'not json', 'utf-8');
    expect(await getCached({ plugin: 'youdao', text: 'hello' }, 60_000)).toBeUndefined();
  });

  it('namespaces by language direction', async () => {
    await setCached({ plugin: 'google', text: 'hello', to: 'zh' }, sample);
    expect(await getCached({ plugin: 'google', text: 'hello', to: 'ja' }, 60_000)).toBeUndefined();
    expect(await getCached({ plugin: 'google', text: 'hello', to: 'zh' }, 60_000)).toEqual(sample);
  });

  it('normalizes whitespace in the query', async () => {
    expect(normalizeQuery('  take \n  off ')).toBe('take off');
    await setCached({ plugin: 'bing', text: 'take  off' }, sample);
    expect(await getCached({ plugin: 'bing', text: ' take off ' }, 60_000)).toEqual(sample);
  });

  it('leaves no temp files behind after writing', async () => {
    await setCached({ plugin: 'youdao', text: 'hello' }, sample);
    const files = await fs.readdir(TMP_DIR);
    expect(files.filter(f => f.endsWith('.tmp'))).toEqual([]);
  });
});

describe('pruneCache', () => {
  it('removes only expired files and is throttled by a marker', async () => {
    await setCached({ plugin: 'youdao', text: 'old' }, sample);
    await setCached({ plugin: 'youdao', text: 'fresh' }, sample);
    const files = (await fs.readdir(TMP_DIR)).filter(f => f.endsWith('.json'));
    const past = new Date(Date.now() - 10 * 60_000);
    await fs.utimes(path.join(TMP_DIR, files[0]), past, past);

    expect(await pruneCache(60_000)).toBe(1);
    expect((await fs.readdir(TMP_DIR)).filter(f => f.endsWith('.json'))).toHaveLength(1);

    // 标记文件还新：再次调用直接跳过
    await fs.utimes(path.join(TMP_DIR, files[1]), past, past).catch(() => undefined);
    const remaining = (await fs.readdir(TMP_DIR)).filter(f => f.endsWith('.json'));
    await fs.utimes(path.join(TMP_DIR, remaining[0]), past, past);
    expect(await pruneCache(60_000)).toBe(0);
    expect(await pruneCache(60_000, true)).toBe(1);
  });

  it('returns 0 when the cache directory does not exist', async () => {
    await clearCache();
    expect(await pruneCache(60_000, true)).toBe(0);
  });
});

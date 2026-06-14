import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getCached, setCached, clearCache } from '../src/utils/cache.js';
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
    await setCached('youdao', 'hello', sample);
    const got = await getCached('youdao', 'hello', 60_000);
    expect(got).toEqual(sample);
  });

  it('returns undefined for a miss', async () => {
    expect(await getCached('youdao', 'never-queried', 60_000)).toBeUndefined();
  });

  it('treats expired entries as a miss', async () => {
    await setCached('youdao', 'hello', sample);
    // ttl = 0 → 任何已存条目都视为过期
    expect(await getCached('youdao', 'hello', 0)).toBeUndefined();
  });

  it('does not cache error results', async () => {
    await setCached('bing', 'hello', { ...sample, error: '请求超时 (10000ms)' });
    expect(await getCached('bing', 'hello', 60_000)).toBeUndefined();
  });

  it('namespaces by plugin', async () => {
    await setCached('youdao', 'hello', sample);
    expect(await getCached('bing', 'hello', 60_000)).toBeUndefined();
  });

  it('clearCache removes stored entries', async () => {
    await setCached('youdao', 'hello', sample);
    await clearCache();
    expect(await getCached('youdao', 'hello', 60_000)).toBeUndefined();
  });

  it('tolerates a corrupt cache file (returns miss)', async () => {
    await setCached('youdao', 'hello', sample);
    const files = await fs.readdir(TMP_DIR);
    await fs.writeFile(path.join(TMP_DIR, files[0]), 'not json', 'utf-8');
    expect(await getCached('youdao', 'hello', 60_000)).toBeUndefined();
  });
});

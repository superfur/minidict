import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { readCacheEntries } from '../src/utils/cache.js';
import { exportCache } from '../src/utils/export.js';
import type { TranslationResult } from '../src/types.js';

const NOW = 1_800_000_000_000;
const TTL = 60_000;
const sample: TranslationResult = {
  word: 'hello',
  phonetic: { uk: 'həˈləʊ', us: 'həˈloʊ' },
  translations: ['你好'],
  examples: [{ en: 'Hello, world!', zh: '你好，世界！' }],
  pluginName: 'Youdao'
};

let directory: string;
let previousCacheDir: string | undefined;

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'minidict-export-test-'));
  previousCacheDir = process.env.MINIDICT_CACHE_DIR;
  process.env.MINIDICT_CACHE_DIR = path.join(directory, 'cache');
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (previousCacheDir === undefined) delete process.env.MINIDICT_CACHE_DIR;
  else process.env.MINIDICT_CACHE_DIR = previousCacheDir;
  await fs.rm(directory, { recursive: true, force: true });
});

async function cache(
  file: string,
  timestamp = NOW,
  result: TranslationResult = sample
): Promise<void> {
  const cacheDirectory = process.env.MINIDICT_CACHE_DIR!;
  await fs.mkdir(cacheDirectory, { recursive: true });
  await fs.writeFile(
    path.join(cacheDirectory, file),
    JSON.stringify({ timestamp, result }),
    'utf-8'
  );
}

describe('cache export', () => {
  it('groups sources by query and language direction', async () => {
    await cache('zh-youdao.json', NOW, { ...sample, from: 'en', to: 'zh' });
    await cache('zh-bing.json', NOW, {
      ...sample,
      pluginName: 'Bing',
      from: 'en',
      to: 'zh'
    });
    await cache('ja-google.json', NOW, {
      ...sample,
      pluginName: 'Google',
      from: 'en',
      to: 'ja',
      translations: ['こんにちは']
    });
    const csvPath = path.join(directory, 'languages.csv');
    const exported = await exportCache({ filePath: csvPath, format: 'csv', ttlMs: TTL });
    expect(exported.wordCount).toBe(2);
    const csv = await fs.readFile(csvPath, 'utf-8');
    const rows = csv
      .trimEnd()
      .split('\n')
      .filter(line => !line.startsWith('#'));
    expect(rows).toHaveLength(2);
    const zhRow = rows.find(row => row.startsWith('"hello [en → zh]",'));
    const jaRow = rows.find(row => row.startsWith('"hello [en → ja]",'));
    expect(zhRow).toContain('<b>Youdao</b>');
    expect(zhRow).toContain('<b>Bing</b>');
    expect(zhRow).not.toContain('<b>Google</b>');
    expect(jaRow).toContain('こんにちは');
    expect(jaRow).not.toContain('<b>Bing</b>');
    const mdPath = path.join(directory, 'languages.md');
    await exportCache({ filePath: mdPath, format: 'md', ttlMs: TTL });
    const md = await fs.readFile(mdPath, 'utf-8');
    expect(md).toContain('## hello \\[en → zh\\]');
    expect(md).toContain('## hello \\[en → ja\\]');
  });

  it('uses the configured TTL and excludes records exactly at the expiry boundary', async () => {
    await cache('fresh.json', NOW - TTL + 1);
    await cache('boundary.json', NOW - TTL, { ...sample, word: 'boundary' });
    await cache('expired.json', NOW - TTL - 1, { ...sample, word: 'expired' });

    expect((await readCacheEntries(TTL)).map(entry => entry.result.word)).toEqual(['hello']);
    expect(await readCacheEntries(0)).toEqual([]);
    expect(await readCacheEntries(TTL * 2)).toHaveLength(3);
  });

  it('includes expired entries on request without changing cache contents', async () => {
    await cache('old.json', NOW - TTL);
    const file = path.join(process.env.MINIDICT_CACHE_DIR!, 'old.json');
    const before = await fs.readFile(file, 'utf-8');

    expect(await readCacheEntries(0, true)).toHaveLength(1);
    expect(await fs.readFile(file, 'utf-8')).toBe(before);
  });

  it('handles a missing cache directory and exports an empty Anki file', async () => {
    const filePath = path.join(directory, 'empty.csv');
    expect(await readCacheEntries(TTL)).toEqual([]);
    expect(await exportCache({ filePath, format: 'csv', ttlMs: TTL })).toMatchObject({
      wordCount: 0
    });
    expect(await fs.readFile(filePath, 'utf-8')).toBe(
      '#separator:Comma\n#html:true\n#columns:Front,Back\n'
    );
  });

  it('skips corrupt, incomplete and failed records while preserving valid results', async () => {
    await cache('valid.json');
    const cacheDirectory = process.env.MINIDICT_CACHE_DIR!;
    const malformed: unknown[] = [
      null,
      {},
      { timestamp: 'yesterday', result: sample },
      { timestamp: NOW, result: { ...sample, translations: [123] } },
      { timestamp: NOW, result: { ...sample, examples: [null] } },
      { timestamp: NOW, result: { ...sample, phonetic: { uk: 123 } } },
      { timestamp: NOW, result: { ...sample, error: 'failed' } }
    ];
    for (let i = 0; i < malformed.length; i++) {
      await fs.writeFile(path.join(cacheDirectory, `bad-${i}.json`), JSON.stringify(malformed[i]));
    }
    await fs.writeFile(path.join(cacheDirectory, 'broken.json'), '{');
    await fs.writeFile(
      path.join(cacheDirectory, 'ignore.txt'),
      JSON.stringify({ timestamp: NOW, result: sample })
    );
    await fs.mkdir(path.join(cacheDirectory, 'directory.json'));

    expect((await readCacheEntries(TTL, true)).map(entry => entry.result.word)).toEqual(['hello']);
  });

  it('reports cache directory access errors instead of silently exporting an empty list', async () => {
    await fs.writeFile(process.env.MINIDICT_CACHE_DIR!, 'not a directory');
    await expect(readCacheEntries(TTL)).rejects.toThrow();
  });

  it('creates one Anki note per query and retains each source, phonetics and examples', async () => {
    await cache('youdao.json');
    await cache('bing.json', NOW, { ...sample, pluginName: 'Bing', translations: ['喂'] });
    await cache('old.json', NOW - TTL, { ...sample, word: 'old' });
    const filePath = path.join(directory, 'vocabulary.csv');

    expect(await exportCache({ filePath, format: 'csv', ttlMs: TTL })).toEqual({
      filePath,
      wordCount: 1
    });
    const csv = await fs.readFile(filePath, 'utf-8');
    const rows = csv
      .trimEnd()
      .split('\n')
      .filter(line => !line.startsWith('#'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatch(/^"hello",".*"$/);
    expect(csv).toContain('<b>Bing</b>');
    expect(csv).toContain('<b>Youdao</b>');
    expect(csv).toContain('英 həˈləʊ / 美 həˈloʊ');
    expect(csv).toContain('Hello, world!<br>你好，世界！');
    expect(csv).not.toContain('"old"');
  });

  it('preserves commas, quotes and line breaks and escapes source text in HTML fields', async () => {
    await cache('special.json', NOW, {
      ...sample,
      word: 'say "hi", <friend> & me',
      translations: ['第一行\n第二行, "引号" <script> &'],
      examples: []
    });
    const filePath = path.join(directory, 'special.csv');
    await exportCache({ filePath, format: 'csv', ttlMs: TTL });
    const csv = await fs.readFile(filePath, 'utf-8');

    expect(csv).toContain('"say &quot;hi&quot;, &lt;friend&gt; &amp; me",');
    expect(csv).toContain('第一行<br>第二行, &quot;引号&quot; &lt;script&gt; &amp;');
    expect(csv).not.toContain('<script>');
    expect(csv.trimEnd().split('\n')).toHaveLength(4);
  });

  it('exports all retained queries in Markdown when expired entries are requested', async () => {
    await cache('fresh.json');
    await cache('old.json', NOW - TTL, { ...sample, word: '*old*', phonetic: 'əʊld' });
    const filePath = path.join(directory, 'vocabulary.md');

    expect(
      await exportCache({ filePath, format: 'md', ttlMs: TTL, includeExpired: true })
    ).toMatchObject({ wordCount: 2 });
    const md = await fs.readFile(filePath, 'utf-8');
    expect(md).toContain('## \\*old\\*');
    expect(md).toContain('## hello');
    expect(md).toContain('### Youdao');
    expect(md).toContain('音标：əʊld');
    expect(md).toContain('- 你好');
    expect(md).toContain('Hello, world!');
  });

  it('leaves existing output files unchanged', async () => {
    await cache('fresh.json');
    const filePath = path.join(directory, 'existing.csv');
    await fs.writeFile(filePath, 'keep this content', 'utf-8');

    await expect(exportCache({ filePath, format: 'csv', ttlMs: TTL })).rejects.toThrow(
      '目标文件已存在'
    );
    expect(await fs.readFile(filePath, 'utf-8')).toBe('keep this content');
  });

  it('reports output failures without claiming that an export succeeded', async () => {
    const filePath = path.join(directory, 'missing-parent', 'vocabulary.csv');
    await expect(exportCache({ filePath, format: 'csv', ttlMs: TTL })).rejects.toThrow();
  });
});

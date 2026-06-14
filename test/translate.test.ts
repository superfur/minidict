import path from 'path';
import os from 'os';
import { translate, availablePlugins, applyMaxExamples } from '../src/translate.js';
import { clearCache } from '../src/utils/cache.js';
import type { Config, TranslationResult } from '../src/types.js';

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    plugins: ['nope'],
    showPhonetic: false,
    showExamples: true,
    maxExamples: 3,
    timeout: 5000,
    cache: { enabled: false, ttl: 0 },
    externalPlugins: [],
    ...overrides
  };
}

beforeAll(() => {
  process.env.MINIDICT_CACHE_DIR = path.join(os.tmpdir(), 'minidict-translate-test');
});

afterAll(async () => {
  await clearCache();
  delete process.env.MINIDICT_CACHE_DIR;
});

describe('translate orchestration', () => {
  it('exposes built-in plugin names', () => {
    expect(availablePlugins()).toEqual(expect.arrayContaining(['bing', 'youdao', 'google']));
  });

  it('produces an error result for an unknown plugin (not silently dropped)', async () => {
    const results = await translate('hello', baseConfig({ plugins: ['nope'] }));
    expect(results).toHaveLength(1);
    expect(results[0].error).toMatch(/未知插件/);
    expect(results[0].pluginName).toBe('Nope');
  });

  it('gracefully degrades an unloadable external plugin to an unknown-plugin error', async () => {
    const results = await translate(
      'hello',
      baseConfig({
        plugins: ['ghost'],
        externalPlugins: ['/definitely/not/a/real/module.mjs']
      })
    );
    expect(results[0].error).toMatch(/未知插件/);
  });

  it('invokes onResult once per requested plugin', async () => {
    const seen: string[] = [];
    await translate('hello', baseConfig({ plugins: ['a', 'b'] }), r => seen.push(r.pluginName));
    expect(seen).toHaveLength(2);
  });
});

describe('applyMaxExamples', () => {
  const make = (n: number): TranslationResult => ({
    word: 'x',
    translations: [],
    examples: Array.from({ length: n }, (_, i) => ({ en: `e${i}`, zh: `示例${i}` })),
    pluginName: 'X'
  });

  it('truncates to the configured maximum', () => {
    expect(applyMaxExamples(make(5), 2).examples).toHaveLength(2);
  });

  it('leaves fewer-than-max untouched', () => {
    expect(applyMaxExamples(make(1), 3).examples).toHaveLength(1);
  });

  it('is a no-op when maxExamples is 0/falsy', () => {
    expect(applyMaxExamples(make(5), 0).examples).toHaveLength(5);
  });
});

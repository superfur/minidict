import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { translate, availablePlugins, applyMaxExamples } from '../src/translate.js';
import { clearCache } from '../src/utils/cache.js';
import type { TranslationResult, UserConfig } from '../src/types.js';
import { fetchMock } from './helpers.js';

let dir: string;
let counter = 0;

/** 在临时目录写一个外部插件模块，返回其绝对路径（插件名由文件名推导）。 */
async function writePlugin(name: string, body: string): Promise<string> {
  const file = path.join(dir, `minidict-${name}.mjs`);
  await fs.writeFile(file, `export default { ${body} };\n`, 'utf-8');
  return file;
}

function options(overrides: UserConfig = {}): UserConfig {
  return { plugins: ['nope'], timeout: 2000, cache: { enabled: false }, ...overrides };
}

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'minidict-translate-test-'));
  process.env.MINIDICT_CACHE_DIR = path.join(dir, 'cache');
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.MINIDICT_CACHE_DIR;
});

beforeEach(async () => {
  await clearCache();
  fetchMock.mockClear();
  counter++;
});

describe('translate orchestration', () => {
  it('exposes built-in plugin names', () => {
    expect(availablePlugins()).toEqual(['bing', 'youdao', 'google']);
  });

  it('rejects an empty query', async () => {
    await expect(translate('   ')).rejects.toThrow(/不能为空/);
  });

  it('produces an error result for an unknown plugin (not silently dropped)', async () => {
    const results = await translate('hello', options({ plugins: ['nope'] }));
    expect(results).toHaveLength(1);
    expect(results[0].error).toMatch(/未知插件/);
    expect(results[0].errorCode).toBe('UNKNOWN_PLUGIN');
    expect(results[0].pluginName).toBe('Nope');
  });

  it('reports why an external plugin could not be loaded', async () => {
    const results = await translate(
      'hello',
      options({ plugins: ['ghost'], externalPlugins: ['/definitely/not/real/minidict-ghost.mjs'] })
    );
    expect(results[0].errorCode).toBe('PLUGIN_LOAD');
    expect(results[0].error).toMatch(/外部插件加载失败/);
  });

  it('de-duplicates plugin names and calls onResult once per plugin', async () => {
    const seen: string[] = [];
    const results = await translate('hello', options({ plugins: ['a', 'B', 'a', ' b '] }), r =>
      seen.push(r.pluginName)
    );
    expect(results.map(r => r.pluginName)).toEqual(['A', 'B']);
    expect(seen.sort()).toEqual(['A', 'B']);
  });

  it('runs an external plugin with a resolved context and returns results in plugin order', async () => {
    const slow = await writePlugin(
      `slow${counter}`,
      `displayName: 'Slow', translate: async (text, ctx) => { await new Promise(r => setTimeout(r, 60)); return { word: text, translations: [ctx.from + '>' + ctx.to + ':' + ctx.timeout], pluginName: 'Slow' }; }`
    );
    const fast = await writePlugin(
      `fast${counter}`,
      `translate: async text => ({ word: text, translations: ['快'], pluginName: '' })`
    );
    const order: string[] = [];
    const results = await translate(
      '你好',
      options({ plugins: [`slow${counter}`, `fast${counter}`], externalPlugins: [slow, fast] }),
      r => order.push(r.pluginName)
    );

    // 返回值按 plugins 顺序；回调按完成先后
    expect(results.map(r => r.pluginName)).toEqual(['Slow', `Fast${counter}`]);
    expect(order).toEqual([`Fast${counter}`, 'Slow']);
    // 中文输入 → 目标语言自动为 en；超时来自配置
    expect(results[0].translations).toEqual(['auto>en:2000']);
    expect(results[0]).toMatchObject({ from: 'auto', to: 'en', cached: false });
    expect(typeof results[0].elapsedMs).toBe('number');
  });

  it('honours explicit from / to', async () => {
    const file = await writePlugin(
      `lang${counter}`,
      `translate: async (text, ctx) => ({ word: text, translations: [ctx.from + '>' + ctx.to], pluginName: 'L' })`
    );
    const [result] = await translate(
      'hello',
      options({ plugins: [`lang${counter}`], externalPlugins: [file], from: 'EN', to: 'jp' })
    );
    expect(result.translations).toEqual(['en>ja']);
  });

  it('still calls the legacy setProxy / setTimeout hooks', async () => {
    const file = await writePlugin(
      `legacy${counter}`,
      `t: 0, setTimeout(ms) { this.t = ms; }, async translate(text) { return { word: text, translations: ['t=' + this.t], pluginName: 'Legacy' }; }`
    );
    const [result] = await translate(
      'hello',
      options({ plugins: [`legacy${counter}`], externalPlugins: [file], timeout: 1234 })
    );
    expect(result.translations).toEqual(['t=1234']);
  });

  it('turns an empty result into a NO_RESULT error and never caches it', async () => {
    const file = await writePlugin(
      `empty${counter}`,
      `n: 0, async translate(text) { this.n++; return { word: text, translations: [], pluginName: 'Empty', phonetic: String(this.n) }; }`
    );
    const opts = options({
      plugins: [`empty${counter}`],
      externalPlugins: [file],
      cache: { enabled: true, ttl: 60_000 }
    });
    const first = await translate('zzz', opts);
    expect(first[0].errorCode).toBe('NO_RESULT');
    const second = await translate('zzz', opts);
    expect(second[0].cached).not.toBe(true);
  });

  it('converts a thrown error into an error result with its code', async () => {
    const file = await writePlugin(
      `boom${counter}`,
      `async translate() { throw new Error('炸了'); }`
    );
    const [result] = await translate(
      'hello',
      options({ plugins: [`boom${counter}`], externalPlugins: [file] })
    );
    expect(result).toMatchObject({ error: '炸了', errorCode: 'UNKNOWN', translations: [] });
  });

  it('serves the second identical query from cache without calling the plugin', async () => {
    const file = await writePlugin(
      `count${counter}`,
      `n: 0, async translate(text) { this.n++; return { word: text, translations: ['call ' + this.n], examples: [1,2,3,4,5].map(i => ({ en: 'e' + i, zh: '例' + i })), pluginName: 'Count' }; }`
    );
    const opts = options({
      plugins: [`count${counter}`],
      externalPlugins: [file],
      cache: { enabled: true, ttl: 60_000 },
      maxExamples: 2
    });
    const first = await translate('hello', opts);
    const second = await translate('hello', opts);
    expect(first[0].cached).toBe(false);
    expect(second[0].cached).toBe(true);
    expect(second[0].translations).toEqual(['call 1']);
    expect(second[0].examples).toHaveLength(2);
    // 缓存里保存的是完整例句：放宽上限后仍能取到全部
    const third = await translate('hello', { ...opts, maxExamples: 0 });
    expect(third[0].examples).toHaveLength(5);
    // 不同方向不共用缓存
    const other = await translate('hello', { ...opts, to: 'ja' });
    expect(other[0].cached).toBe(false);
  });

  it('reports built-in plugin failures as error results when the network is down', async () => {
    const results = await translate('hello', options({ plugins: ['youdao', 'google'] }));
    expect(results.map(r => r.pluginName)).toEqual(['Youdao', 'Google']);
    expect(results.every(r => r.errorCode === 'NETWORK')).toBe(true);
  });
});

describe('applyMaxExamples', () => {
  const make = (n: number): TranslationResult => ({
    word: 'x',
    translations: [],
    examples: Array.from({ length: n }, (_, i) => ({ en: `e${i}`, zh: `示例${i}` })),
    pluginName: 'X'
  });

  it('truncates to the configured maximum without mutating the input', () => {
    const input = make(5);
    expect(applyMaxExamples(input, 2).examples).toHaveLength(2);
    expect(input.examples).toHaveLength(5);
  });

  it('leaves fewer-than-max untouched', () => {
    expect(applyMaxExamples(make(1), 3).examples).toHaveLength(1);
  });

  it('is a no-op when maxExamples is 0', () => {
    expect(applyMaxExamples(make(5), 0).examples).toHaveLength(5);
  });
});

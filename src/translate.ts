import type { TranslationResult, Config, DictionaryPlugin } from './types.js';
import bingPlugin from './plugins/minidict-bing/index.js';
import youdaoPlugin from './plugins/minidict-youdao/index.js';
import googlePlugin from './plugins/minidict-google/index.js';
import { getCached, setCached } from './utils/cache.js';

interface PluginTask {
  name: string;
  plugin: DictionaryPlugin;
}

const PLUGIN_MAP: Record<string, PluginTask> = {
  bing: { name: 'bing', plugin: bingPlugin },
  youdao: { name: 'youdao', plugin: youdaoPlugin },
  google: { name: 'google', plugin: googlePlugin }
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 返回内置插件名列表，供 CLI/外部校验使用 */
export function availablePlugins(): string[] {
  return Object.keys(PLUGIN_MAP);
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 从模块说明符推导插件名：'minidict-openai' → 'openai'，'/path/foo.js' → 'foo'。 */
function derivePluginName(spec: string): string {
  const base = spec.split('/').pop() || spec;
  return base
    .replace(/\.[mc]?js$/, '')
    .replace(/^minidict-/, '')
    .toLowerCase();
}

/**
 * 构建运行时插件注册表：内置插件 + 配置中声明的外部插件（按需动态加载）。
 * 外部插件加载失败时静默跳过——引用它时会以「未知插件」形式提示，不影响其它插件。
 */
async function buildRegistry(config: Config): Promise<Record<string, PluginTask>> {
  const registry: Record<string, PluginTask> = { ...PLUGIN_MAP };
  for (const spec of config.externalPlugins ?? []) {
    try {
      const mod = await import(spec);
      const plugin = (mod.default ?? mod) as DictionaryPlugin;
      if (typeof plugin?.translate !== 'function') continue;
      const name = derivePluginName(spec);
      registry[name] = { name, plugin };
    } catch {
      // 加载失败：跳过该外部插件
    }
  }
  return registry;
}

export function applyMaxExamples(
  result: TranslationResult,
  maxExamples: number
): TranslationResult {
  if (result.examples && maxExamples) {
    result.examples = result.examples.slice(0, maxExamples);
  }
  return result;
}

/**
 * 编排级安全网：插件自身已有 fetch 超时，但解析等非网络阶段仍可能卡住。
 * 这里给整个插件调用套一个更宽松的总超时，确保 CLI 永不无限挂起。
 */
function withGuardTimeout<T>(promise: Promise<T>, guardMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`插件 ${label} 响应超时 (${guardMs}ms)`)),
      guardMs
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function translate(
  word: string,
  config: Config,
  onResult?: (result: TranslationResult) => void
): Promise<TranslationResult[]> {
  const plugins = config.plugins || ['bing', 'youdao'];
  const timeout = config.timeout || 10000;
  // 总超时安全网需覆盖 fetch 超时 + 一次重试 + 退避，留足缓冲。
  const guardMs = timeout * 2 + 5000;
  const cacheEnabled = config.cache?.enabled ?? true;
  const cacheTtl = config.cache?.ttl ?? SEVEN_DAYS_MS;

  const registry = await buildRegistry(config);

  // 仅对「被选中且有效」的插件设置代理/超时（去重，避免重复调用）。
  const configured = new Set<string>();
  for (const pluginName of plugins) {
    const task = registry[pluginName];
    if (task && !configured.has(pluginName)) {
      task.plugin.setProxy?.(config.proxy);
      task.plugin.setTimeout?.(timeout);
      configured.add(pluginName);
    }
  }

  const results: TranslationResult[] = [];

  // 每个插件查询封装为一个 Promise<TranslationResult>，永不 reject；
  // 未知插件名同样产出一个 error 结果（而非静默丢弃），便于用户察觉拼写错误。
  const tasks = plugins.map(async (pluginName): Promise<TranslationResult> => {
    const task = registry[pluginName];
    if (!task) {
      return {
        word,
        translations: [],
        examples: [],
        pluginName: capitalize(pluginName),
        error: `未知插件 "${pluginName}"，可用插件：${Object.keys(registry).join(' / ')}`
      };
    }

    // 命中缓存则直接返回（仍按当前 maxExamples 截断）。
    if (cacheEnabled) {
      const cached = await getCached(task.name, word, cacheTtl);
      if (cached) {
        return applyMaxExamples(cached, config.maxExamples);
      }
    }

    try {
      const result = await withGuardTimeout(task.plugin.translate(word), guardMs, task.name);

      if (cacheEnabled) {
        await setCached(task.name, word, result);
      }

      return applyMaxExamples(result, config.maxExamples);
    } catch (error) {
      return {
        word,
        translations: [],
        examples: [],
        pluginName: capitalize(task.name),
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  });

  // 按「完成先后」触发 onResult，使快插件先于慢插件被展示（真正的流式输出）。
  await Promise.all(
    tasks.map(task =>
      task.then(result => {
        results.push(result);
        onResult?.(result);
        return result;
      })
    )
  );

  return results;
}

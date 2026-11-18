import type {
  Config,
  DictionaryPlugin,
  TranslateContext,
  TranslationResult,
  UserConfig
} from './types.js';
import { resolveConfig } from './config.js';
import { MinidictError, errorCodeOf, errorMessageOf } from './errors.js';
import { resolveLanguages } from './lang.js';
import { BUILTIN_PLUGINS, buildRegistry } from './plugins/index.js';
import { getCached, normalizeQuery, pruneCache, setCached } from './utils/cache.js';

/** 插件请求成功但未返回任何释义时使用的错误信息。 */
export const NO_RESULT_MESSAGE = '未找到释义';

/** 返回内置插件名列表。 */
export function availablePlugins(): string[] {
  return Object.keys(BUILTIN_PLUGINS);
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 返回例句被截断到 maxExamples 条的新结果（不修改入参）；maxExamples ≤ 0 表示不限制。 */
export function applyMaxExamples(
  result: TranslationResult,
  maxExamples: number
): TranslationResult {
  if (!result.examples || !(maxExamples > 0) || result.examples.length <= maxExamples) {
    return result;
  }
  return { ...result, examples: result.examples.slice(0, maxExamples) };
}

/**
 * 编排级安全网：给整个插件调用套一个总超时，确保即使插件自身实现有缺陷
 * （如外部插件忽略了 context.timeout），调用方也不会无限挂起。
 */
function withGuardTimeout<T>(promise: Promise<T>, guardMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new MinidictError('TIMEOUT', `插件 ${label} 响应超时 (${guardMs}ms)`)),
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

function failure(
  word: string,
  pluginName: string,
  error: unknown,
  extra: Partial<TranslationResult> = {}
): TranslationResult {
  return {
    word,
    translations: [],
    examples: [],
    pluginName,
    error: errorMessageOf(error),
    errorCode: errorCodeOf(error),
    ...extra
  };
}

async function runPlugin(
  name: string,
  plugin: DictionaryPlugin,
  text: string,
  context: TranslateContext,
  config: Config
): Promise<TranslationResult> {
  const displayName = plugin.displayName || capitalize(name);
  const meta = { from: context.from, to: context.to };
  const cacheKey = { plugin: name, text, from: context.from, to: context.to };
  const started = Date.now();

  if (config.cache.enabled) {
    const cached = await getCached(cacheKey, config.cache.ttl);
    if (cached) {
      return { ...cached, ...meta, cached: true, elapsedMs: Date.now() - started };
    }
  }

  try {
    // 2.x 遗留接口：仍然调用，保证旧的外部插件无需修改即可工作。
    plugin.setProxy?.(context.proxy);
    plugin.setTimeout?.(context.timeout);

    // 总超时需覆盖「两次请求（如先取令牌再翻译）+ 一次重试」，留足缓冲。
    const guardMs = context.timeout * 2 + 5000;
    const raw = await withGuardTimeout(plugin.translate(text, context), guardMs, name);

    if (raw?.error) {
      throw new MinidictError(raw.errorCode ?? 'UNKNOWN', raw.error);
    }
    // 「请求成功但没有任何释义」不是成功：既不显示 ✓，也不写入缓存。
    if (!Array.isArray(raw?.translations) || raw.translations.length === 0) {
      throw new MinidictError('NO_RESULT', NO_RESULT_MESSAGE);
    }

    const result: TranslationResult = {
      ...raw,
      word: raw.word || text,
      pluginName: raw.pluginName || displayName
    };
    if (config.cache.enabled) {
      await setCached(cacheKey, result);
    }
    return { ...result, ...meta, cached: false, elapsedMs: Date.now() - started };
  } catch (error) {
    return failure(text, displayName, error, { ...meta, elapsedMs: Date.now() - started });
  }
}

/**
 * 并发查询所有启用的词典插件。
 *
 * @param text     要查询的单词、短语或句子
 * @param options  配置（均可省略，缺省值见 defaultConfig）
 * @param onResult 每个来源完成时立即回调（按完成先后），用于流式展示
 * @returns 所有来源的结果，顺序与 `plugins` 一致；失败的来源以带 `error` 的结果表示，本函数不因单个来源失败而 reject
 */
export async function translate(
  text: string,
  options: UserConfig = {},
  onResult?: (result: TranslationResult) => void
): Promise<TranslationResult[]> {
  const config = resolveConfig(options);
  const query = normalizeQuery(text ?? '');
  if (!query) {
    throw new MinidictError('UNSUPPORTED', '查询内容不能为空');
  }

  const { from, to } = resolveLanguages(query, config.from, config.to);
  const context: TranslateContext = { from, to, timeout: config.timeout, proxy: config.proxy };
  const registry = await buildRegistry(config.externalPlugins);

  // 归一并去重插件名，保持用户给定的顺序。
  const names = [...new Set(config.plugins.map(p => p.trim().toLowerCase()).filter(Boolean))];

  const tasks = names.map(async (name): Promise<TranslationResult> => {
    const plugin = registry.plugins[name];
    let result: TranslationResult;
    if (plugin) {
      result = applyMaxExamples(
        await runPlugin(name, plugin, query, context, config),
        config.maxExamples
      );
    } else if (registry.loadErrors[name]) {
      result = failure(
        query,
        capitalize(name),
        new MinidictError('PLUGIN_LOAD', `外部插件加载失败：${registry.loadErrors[name]}`)
      );
    } else {
      const available = Object.keys(registry.plugins).join(' / ');
      result = failure(
        query,
        capitalize(name),
        new MinidictError('UNKNOWN_PLUGIN', `未知插件 "${name}"，可用插件：${available}`)
      );
    }
    try {
      onResult?.(result);
    } catch {
      // 回调里的异常不应中断其它来源
    }
    return result;
  });

  const results = await Promise.all(tasks);

  if (config.cache.enabled) {
    // 每天至多一次：顺手清理过期缓存文件，避免目录无限增长。
    await pruneCache(config.cache.ttl);
  }

  return results;
}

import path from 'path';
import { pathToFileURL } from 'url';
import type { DictionaryPlugin } from '../types.js';
import bingPlugin from './bing/index.js';
import youdaoPlugin from './youdao/index.js';
import googlePlugin from './google/index.js';

export const BUILTIN_PLUGINS: Readonly<Record<string, DictionaryPlugin>> = Object.freeze({
  bing: bingPlugin,
  youdao: youdaoPlugin,
  google: googlePlugin
});

export interface PluginRegistry {
  plugins: Record<string, DictionaryPlugin>;
  /** 外部插件名 → 加载失败原因。引用到该插件时据此给出明确错误。 */
  loadErrors: Record<string, string>;
}

/** 从模块说明符推导插件名：'minidict-openai' → 'openai'，'/path/foo.js' → 'foo'。 */
export function derivePluginName(spec: string): string {
  const base = spec.split(/[\\/]/).pop() || spec;
  return base
    .replace(/\.[mc]?js$/, '')
    .replace(/^minidict-/, '')
    .toLowerCase();
}

/** 文件路径（绝对/相对/~）转成可 import 的 file:// URL；包名原样返回。 */
function toImportTarget(spec: string): string {
  const isPath = spec.startsWith('.') || spec.startsWith('~') || path.isAbsolute(spec);
  if (!isPath) return spec;
  const expanded = spec.startsWith('~')
    ? path.join(process.env.HOME || process.env.USERPROFILE || '', spec.slice(1))
    : spec;
  return pathToFileURL(path.resolve(expanded)).href;
}

/**
 * 构建运行时插件注册表：内置插件 + 配置中声明的外部插件（按需动态加载）。
 * 外部插件加载失败不影响其它插件，失败原因记入 loadErrors。
 */
export async function buildRegistry(externalPlugins: readonly string[]): Promise<PluginRegistry> {
  const plugins: Record<string, DictionaryPlugin> = { ...BUILTIN_PLUGINS };
  const loadErrors: Record<string, string> = {};

  for (const spec of externalPlugins) {
    const name = derivePluginName(spec);
    try {
      const mod = await import(toImportTarget(spec));
      const plugin = (mod.default ?? mod) as DictionaryPlugin;
      if (typeof plugin?.translate !== 'function') {
        loadErrors[name] = `模块 ${spec} 的默认导出未实现 translate()`;
        continue;
      }
      plugins[name] = plugin;
    } catch (error) {
      loadErrors[name] = error instanceof Error ? error.message : String(error);
    }
  }

  return { plugins, loadErrors };
}

import type { TranslationResult, Config } from './types.js';
import bingPlugin from './plugins/minidict-bing/index.js';
import youdaoPlugin from './plugins/minidict-youdao/index.js';
import googlePlugin from './plugins/minidict-google/index.js';

interface PluginTask {
  name: string;
  plugin: any;
}

const PLUGIN_MAP: Record<string, PluginTask> = {
  bing: { name: 'bing', plugin: bingPlugin },
  youdao: { name: 'youdao', plugin: youdaoPlugin },
  google: { name: 'google', plugin: googlePlugin }
};

export async function translate(
  word: string,
  config: Config,
  onResult?: (result: TranslationResult) => void
): Promise<TranslationResult[]> {
  const plugins = config.plugins || ['bing', 'youdao'];
  const timeout = config.timeout || 3000;

  bingPlugin.setProxy?.(config.proxy);
  bingPlugin.setTimeout?.(timeout);
  youdaoPlugin.setProxy?.(config.proxy);
  youdaoPlugin.setTimeout?.(timeout);
  googlePlugin.setProxy?.(config.proxy);
  googlePlugin.setTimeout?.(timeout);

  const results: TranslationResult[] = [];

  const tasks = plugins
    .map(pluginName => PLUGIN_MAP[pluginName])
    .filter(Boolean)
    .map(async (task) => {
      try {
        const result = await task.plugin.translate(word);

        if (result.examples && config.maxExamples) {
          result.examples = result.examples.slice(0, config.maxExamples);
        }

        return result;
      } catch (error) {
        return {
          word,
          translations: [],
          examples: [],
          pluginName: task.name.charAt(0).toUpperCase() + task.name.slice(1),
          error: error instanceof Error ? error.message : '未知错误'
        };
      }
    });

  for await (const taskResult of tasks) {
    results.push(taskResult);
    if (onResult) {
      onResult(taskResult);
    }
  }

  return results;
} 
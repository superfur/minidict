import type { TranslationResult } from './types.js';
import bingPlugin from './plugins/minidict-bing/index.js';
import youdaoPlugin from './plugins/minidict-youdao/index.js';

export async function translate(word: string, plugins: string[] = ['bing', 'youdao']): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  for (const plugin of plugins) {
    try {
      let result: TranslationResult;
      
      if (plugin === 'bing') {
        result = await bingPlugin.translate(word);
      } else if (plugin === 'youdao') {
        result = await youdaoPlugin.translate(word);
      } else {
        console.error(`未知的插件: ${plugin}`);
        continue;
      }

      results.push(result);
    } catch (error) {
      console.error(`${plugin}插件执行失败:`, error);
    }
  }

  return results;
} 
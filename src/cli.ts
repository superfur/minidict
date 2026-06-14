#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const modRequire = createRequire(import.meta.url);
const pkg = modRequire('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import { formatHeader, formatResult, formatErrorResult, formatSummary } from './utils/format.js';
import { clearCache } from './utils/cache.js';
import type { TranslationResult } from './types.js';

interface CommandOptions {
  examples?: boolean;
  phonetic?: boolean;
  maxExamples?: string;
  plugin?: string;
  config?: string;
  timeout?: string;
  cache?: boolean;
  clearCache?: boolean;
}

/** 解析正整数 CLI 参数，非法（NaN / ≤0）时回退到 fallback。 */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function run(): Promise<void> {
  program.name('dict').description('一个简单的命令行词典工具').version(pkg.version);

  program
    .argument('[text...]', '要查询的单词、短语或句子')
    .option('-p, --plugin <plugins>', '指定词典插件 (bing/youdao/google，可用逗号分隔)')
    .option('--phonetic', '显示音标')
    .option('--examples', '显示例句')
    .option('--max-examples <number>', '最大例句数量')
    .option('--config <path>', '配置文件路径')
    .option('--timeout <number>', '请求超时时间（毫秒）')
    .option('--no-cache', '本次查询不使用缓存')
    .option('--clear-cache', '清空查询缓存后退出')
    .action(async (textArray: string[], options: CommandOptions) => {
      if (options.clearCache) {
        await clearCache();
        console.log(chalk.green('已清空缓存'));
        process.exit(0);
      }

      const text = (textArray ?? []).join(' ').trim();
      if (!text) {
        program.help();
      }

      const config = await loadConfig(options.config);

      if (options.plugin) {
        config.plugins = options.plugin
          .split(',')
          .map(p => p.trim().toLowerCase())
          .filter(Boolean);
      }
      if (options.phonetic !== undefined) {
        config.showPhonetic = options.phonetic;
      }
      if (options.examples !== undefined) {
        config.showExamples = options.examples;
      }
      config.maxExamples = parsePositiveInt(options.maxExamples, config.maxExamples);
      config.timeout = parsePositiveInt(options.timeout, config.timeout ?? 10000);
      // commander 的 --no-cache 在传入时把 options.cache 置为 false。
      if (options.cache === false) {
        config.cache = { enabled: false, ttl: config.cache?.ttl ?? 0 };
      }

      const startTime = Date.now();
      const results: TranslationResult[] = [];

      // 先打印查询头，随后每个插件结果「到达即打印」——真正的流式展示，
      // 快插件不再被慢插件阻塞。音标随各来源卡片一并展示。
      console.log(formatHeader(text));
      console.log('');

      await translate(text, config, result => {
        results.push(result);
        if (result.error) {
          console.log(formatErrorResult(result));
        } else {
          console.log(
            formatResult(result, config.showPhonetic, config.showExamples, config.maxExamples)
          );
        }
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(formatSummary(results, elapsed));

      process.exit(0);
    });

  program.parse();
}

run().catch(error => {
  console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
  process.exit(1);
});

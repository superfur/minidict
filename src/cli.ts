#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const modRequire = createRequire(import.meta.url);
const pkg = modRequire('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import {
  formatHeader,
  formatResult,
  formatErrorResult,
  formatSummary,
  formatUpdateNotice
} from './utils/format.js';
import { clearCache } from './utils/cache.js';
import { checkForUpdate, runUpdate } from './utils/update.js';
import type { TranslationResult, ProxyConfig } from './types.js';

interface CommandOptions {
  examples?: boolean;
  phonetic?: boolean;
  maxExamples?: string;
  plugin?: string;
  config?: string;
  timeout?: string;
  cache?: boolean;
  clearCache?: boolean;
  update?: boolean;
  updateCheck?: boolean;
}

/** 解析正整数 CLI 参数，非法（NaN / ≤0）时回退到 fallback。 */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 执行 `dict -u`：检查最新版并按检测到的包管理器升级，结果以中文提示呈现。 */
async function performUpdate(proxy: ProxyConfig | undefined, timeout: number): Promise<void> {
  const result = await runUpdate({ current: pkg.version, proxy, timeout });
  switch (result.status) {
    case 'latest':
      console.log(chalk.green(`✓ 已是最新版本 v${result.current}`));
      break;
    case 'upgraded':
      console.log(chalk.green(`✓ 已升级到 v${result.latest}（${result.command}）`));
      break;
    case 'node-too-old':
      console.log(
        chalk.red(
          `✗ 新版本 v${result.latest} 需要 Node >= ${result.requiredNode}，当前 ${process.version}。\n` +
            `  请先升级 Node 后再运行 dict -u。`
        )
      );
      break;
    case 'pm-missing':
      console.log(
        chalk.yellow(
          `⚠ 未找到包管理器命令「${result.packageManager}」。\n` + `  请手动执行：${result.command}`
        )
      );
      break;
    case 'failed':
      console.log(
        chalk.red(
          `✗ 升级失败。可手动执行：${result.command}\n` +
            `  若为全局目录权限问题，请尝试加 sudo 或修复 npm 全局前缀。`
        )
      );
      break;
    case 'check-failed':
    default:
      console.log(chalk.yellow('⚠ 无法获取最新版本信息（网络或代理问题），请稍后重试。'));
      break;
  }
}

/** 正常查询后的新版本提示：节流、可关闭、CI 静默，绝不影响主流程。 */
async function maybeNotifyUpdate(
  config: Awaited<ReturnType<typeof loadConfig>>,
  options: CommandOptions,
  current: string
): Promise<void> {
  const disabled =
    config.autoUpdate?.enabled === false ||
    options.updateCheck === false ||
    !!process.env.CI ||
    !!process.env.MINIDICT_NO_UPDATE_CHECK;
  if (disabled) return;

  try {
    const notice = await checkForUpdate({
      current,
      proxy: config.proxy,
      timeout: 3000,
      intervalMs: config.autoUpdate?.checkInterval
    });
    if (notice) {
      console.log('');
      console.log(formatUpdateNotice(notice.current, notice.latest, notice.requiredNode));
    }
  } catch {
    // 更新检查失败绝不影响查询结果
  }
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
    .option('-u, --update', '检查并升级到最新版本后退出')
    .option('--no-update-check', '本次查询不检查新版本')
    .action(async (textArray: string[], options: CommandOptions) => {
      if (options.clearCache) {
        await clearCache();
        console.log(chalk.green('已清空缓存'));
        process.exit(0);
      }

      if (options.update) {
        const config = await loadConfig(options.config);
        await performUpdate(config.proxy, config.timeout ?? 10000);
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

      await maybeNotifyUpdate(config, options, pkg.version);

      process.exit(0);
    });

  program.parse();
}

run().catch(error => {
  console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
  process.exit(1);
});

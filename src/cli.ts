#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { translate, availablePlugins } from './translate.js';
import { loadConfig } from './config.js';
import { isZhEnPair, resolveLanguages } from './lang.js';
import { derivePluginName } from './plugins/index.js';
import {
  formatHeader,
  formatResult,
  formatSummary,
  formatUpdateNotice,
  ICONS
} from './render/card.js';
import { formatJson, formatPlainResult } from './render/plain.js';
import { clearCache, normalizeQuery } from './utils/cache.js';
import { checkForUpdate, runUpdate, type UpdateNotice } from './utils/update.js';
import { version } from './version.js';
import type { Config, ProxyConfig, TranslationResult } from './types.js';

interface CommandOptions {
  plugin?: string;
  from?: string;
  to?: string;
  examples?: boolean;
  phonetic?: boolean;
  maxExamples?: string;
  config?: string;
  timeout?: string;
  json?: boolean;
  plain?: boolean;
  card?: boolean;
  cache?: boolean;
  clearCache?: boolean;
  listPlugins?: boolean;
  update?: boolean;
  updateCheck?: boolean;
}

/** 解析正整数 CLI 参数，非法（NaN / ≤0）时回退到 fallback。 */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 从管道读取查询内容（`echo hello | dict`）。 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/** 执行 `dict -u`：检查最新版并按检测到的包管理器升级，结果以中文提示呈现。 */
async function performUpdate(proxy: ProxyConfig | undefined, timeout: number): Promise<boolean> {
  const result = await runUpdate({ current: version, proxy, timeout });
  switch (result.status) {
    case 'latest':
      console.log(chalk.green(`✓ 已是最新版本 v${result.current}`));
      return true;
    case 'upgraded':
      console.log(chalk.green(`✓ 已升级到 v${result.latest}（${result.command}）`));
      return true;
    case 'node-too-old':
      console.log(
        chalk.red(
          `✗ 新版本 v${result.latest} 需要 Node >= ${result.requiredNode}，当前 ${process.version}。\n` +
            `  请先升级 Node 后再运行 dict -u。`
        )
      );
      return false;
    case 'pm-missing':
      console.log(
        chalk.yellow(
          `⚠ 未找到包管理器命令「${result.packageManager}」。\n` + `  请手动执行：${result.command}`
        )
      );
      return false;
    case 'failed':
      console.log(
        chalk.red(
          `✗ 升级失败。可手动执行：${result.command}\n` +
            `  若为全局目录权限问题，请尝试加 sudo 或修复 npm 全局前缀。`
        )
      );
      return false;
    case 'check-failed':
    default:
      console.log(chalk.yellow('⚠ 无法获取最新版本信息（网络或代理问题），请稍后重试。'));
      return false;
  }
}

/**
 * 启动新版本检查（节流、可关闭、CI 静默）。与查询并发执行，
 * 查询结束时通常已有结果，不再让用户为它额外等待。永不 reject。
 */
function startUpdateCheck(config: Config, options: CommandOptions): Promise<UpdateNotice | null> {
  const disabled =
    config.autoUpdate.enabled === false ||
    options.updateCheck === false ||
    !!process.env.CI ||
    !!process.env.MINIDICT_NO_UPDATE_CHECK;
  if (disabled) return Promise.resolve(null);

  return checkForUpdate({
    current: version,
    proxy: config.proxy,
    timeout: 3000,
    intervalMs: config.autoUpdate.checkInterval
  }).catch(() => null);
}

/** 把命令行参数覆盖到配置上。 */
function applyOptions(config: Config, options: CommandOptions): Config {
  const merged: Config = { ...config };
  if (options.plugin) {
    merged.plugins = options.plugin
      .split(',')
      .map(p => p.trim().toLowerCase())
      .filter(Boolean);
  }
  if (options.from) merged.from = options.from;
  if (options.to) merged.to = options.to;
  if (options.phonetic !== undefined) merged.showPhonetic = options.phonetic;
  if (options.examples !== undefined) merged.showExamples = options.examples;
  merged.maxExamples = parsePositiveInt(options.maxExamples, config.maxExamples);
  merged.timeout = parsePositiveInt(options.timeout, config.timeout);
  // commander 的 --no-cache 在传入时把 options.cache 置为 false。
  if (options.cache === false) {
    merged.cache = { ...config.cache, enabled: false };
  }
  return merged;
}

async function main(textArray: string[], options: CommandOptions, program: Command) {
  if (options.clearCache) {
    await clearCache();
    console.log(chalk.green('已清空缓存'));
    return 0;
  }

  if (options.listPlugins) {
    const config = await loadConfig(options.config);
    const enabled = new Set(config.plugins);
    for (const name of availablePlugins()) {
      console.log(`${enabled.has(name) ? ICONS.OK : ' '} ${name}`);
    }
    for (const spec of config.externalPlugins) {
      const name = derivePluginName(spec);
      console.log(
        `${enabled.has(name) ? ICONS.OK : ' '} ${name} ${chalk.gray(`(外部插件：${spec})`)}`
      );
    }
    return 0;
  }

  if (options.update) {
    const config = await loadConfig(options.config);
    return (await performUpdate(config.proxy, config.timeout)) ? 0 : 1;
  }

  let text = normalizeQuery((textArray ?? []).join(' '));
  if (!text && !process.stdin.isTTY) {
    text = normalizeQuery(await readStdin());
  }
  if (!text) {
    program.outputHelp();
    return 0;
  }

  const config = applyOptions(await loadConfig(options.config), options);
  const { from, to, source } = resolveLanguages(text, config.from, config.to);
  // 默认的中英互查不必提示方向；指定了语言或检测到其它语言时才在查询头里标出。
  const showDirection = config.from !== 'auto' || config.to !== 'auto' || !isZhEnPair(source, to);

  // 输出形式：--json > --plain > --card > 自动（终端用卡片，管道/重定向用纯文本）。
  const mode = options.json
    ? 'json'
    : options.plain || (!options.card && !process.stdout.isTTY)
      ? 'plain'
      : 'card';

  const pendingNotice = mode === 'card' ? startUpdateCheck(config, options) : null;
  const startTime = Date.now();

  if (mode === 'card') {
    // 先打印查询头，随后每个来源「到达即打印」，快来源不被慢来源阻塞。
    console.log(showDirection ? formatHeader(text, from, to) : formatHeader(text));
    console.log('');
  }

  const results: TranslationResult[] = await translate(text, config, result => {
    const args = [config.showPhonetic, config.showExamples, config.maxExamples] as const;
    if (mode === 'card') console.log(formatResult(result, ...args));
    else if (mode === 'plain') console.log(formatPlainResult(result, ...args));
  });

  const elapsedMs = Date.now() - startTime;
  // 所有来源都失败时以非零码退出，便于脚本/管道判断查询是否成功。
  const ok = results.some(r => !r.error);

  if (mode === 'json') {
    console.log(formatJson({ query: text, from, to, elapsedMs, ok, results }));
  } else if (mode === 'card') {
    console.log(formatSummary(results, (elapsedMs / 1000).toFixed(1)));
    const notice = await pendingNotice;
    if (notice) {
      console.log('');
      console.log(formatUpdateNotice(notice.current, notice.latest, notice.requiredNode));
    }
  }

  return ok ? 0 : 1;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('dict')
    .description('一个简单易用的命令行词典 / 翻译工具')
    .version(version, '-v, --version', '显示版本')
    .helpOption('-h, --help', '显示帮助')
    .argument('[text...]', '要查询的单词、短语或句子（也可从管道读入）')
    .option('-p, --plugin <plugins>', '指定词典来源，逗号分隔（bing / youdao / google）')
    .option('-f, --from <lang>', '源语言代码（默认自动检测），如 en / zh / ja')
    .option('-t, --to <lang>', '目标语言代码（默认：中文 → en，其它 → zh）')
    .option('--phonetic', '显示音标（默认）')
    .option('--no-phonetic', '不显示音标')
    .option('-e, --examples', '显示例句')
    .option('--no-examples', '不显示例句（默认）')
    .option('--max-examples <number>', '最大例句数量')
    .option('--timeout <ms>', '请求超时时间（毫秒）')
    .option('--config <path>', '配置文件路径（默认 ~/.minidict.json）')
    .option('--json', '以 JSON 输出（便于脚本处理）')
    .option('--plain', '以纯文本输出（无边框；管道/重定向时自动启用）')
    .option('--card', '以卡片输出（终端下的默认形式）')
    .option('--no-cache', '本次查询不使用缓存')
    .option('--clear-cache', '清空查询缓存后退出')
    .option('--list-plugins', '列出可用的词典来源后退出')
    .option('-u, --update', '检查并升级到最新版本后退出')
    .option('--no-update-check', '本次查询不检查新版本')
    .action(async (textArray: string[], options: CommandOptions) => {
      // 用 exitCode 而非 process.exit()：让 stdout 在管道下也能完整刷出后再退出。
      process.exitCode = await main(textArray, options, program);
    });

  // action 是异步的：必须用 parseAsync 等待，否则其中抛出的错误会变成
  // 未处理的 Promise rejection（打印堆栈），而不会走到统一的错误处理。
  await program.parseAsync(argv);
}

run().then(
  // 代理 Agent 等可能保持事件循环存活；输出已写完，这里显式结束进程。
  () => process.stdout.write('', () => process.exit(process.exitCode ?? 0)),
  error => {
    console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
    process.exit(1);
  }
);

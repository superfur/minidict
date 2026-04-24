#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const modRequire = createRequire(import.meta.url);
const pkg = modRequire('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import { formatResult, formatSummary, COLORS } from './utils/format.js';
import type { Config } from './types.js';

export async function run(): Promise<void> {
  program
    .name('dict')
    .description('一个简单的命令行词典工具')
    .version(pkg.version);

  program
    .argument('<text...>', '要查询的单词、短语或句子')
    .option('-p, --plugin <plugins>', '指定词典插件 (bing/youdao/google，可用逗号分隔)')
    .option('--phonetic', '显示音标')
    .option('--examples', '显示例句')
    .option('--max-examples <number>', '最大例句数量')
    .option('--config <path>', '配置文件路径')
    .option('--timeout <number>', '请求超时时间（毫秒）')
    .action(async (textArray: string[], options: {
      examples?: boolean;
      phonetic?: boolean;
      maxExamples?: string;
      plugin?: string;
      config?: string;
      timeout?: string;
    }) => {
      const text = textArray.join(' ');

      const config = await loadConfig(options.config);

      if (options.plugin) {
        config.plugins = options.plugin.split(',').map(p => p.trim().toLowerCase());
      }
      if (options.phonetic !== undefined) {
        config.showPhonetic = options.phonetic;
      }
      if (options.examples !== undefined) {
        config.showExamples = options.examples;
      }
      if (options.maxExamples) {
        config.maxExamples = parseInt(options.maxExamples, 10) || config.maxExamples;
      }
      if (options.timeout) {
        config.timeout = parseInt(options.timeout, 10);
      }

      console.log(chalk.bold.cyan(`  dict ${text}`));
      console.log(chalk.gray('  ' + '━'.repeat(41)));
      console.log('');

      const startTime = Date.now();
      const results: any[] = [];
      let phoneticShown = false;

      await translate(text, config, (result) => {
        results.push(result);

        if (!phoneticShown && !result.error && config.showPhonetic && result.phonetic) {
          console.log(formatPhoneticLine(result.phonetic));
          console.log('');
          phoneticShown = true;
        }

        if (result.error) {
          console.log(formatErrorResult(result));
        } else {
          console.log(formatResult(result, false, config.showExamples, config.maxExamples));
        }
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(formatSummary(results, elapsed));
    });

  program.parse();
}

function formatPhoneticLine(phonetic: any): string {
  if (typeof phonetic === 'string') {
    return `  🔊 [${phonetic}]`;
  }

  const parts: string[] = [];
  if (phonetic.uk) {
    parts.push(`英 [${phonetic.uk}]`);
  }
  if (phonetic.us) {
    parts.push(`美 [${phonetic.us}]`);
  }

  if (parts.length > 0) {
    return `  🔊 ${parts.join('  ')}`;
  }
  return '';
}

function formatErrorResult(result: any): string {
  let status = '⚠';
  let reason = '不可用';
  if (result.error) {
    if (result.error.includes('超时')) {
      reason = '连接超时';
    } else if (result.error.includes('HTTP error')) {
      reason = '网络错误';
    } else {
      reason = '请求失败';
    }
  }

  return `  ${COLORS.bold.gray(result.pluginName)}  ${chalk.red(status + ' ' + reason)}${result.error ? ' · ' + COLORS.gray(result.error) : ''}`;
}

run().catch(error => {
  console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
  process.exit(1);
}); 
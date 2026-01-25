#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';
const modRequire = createRequire(import.meta.url);
const pkg = modRequire('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import { formatResult, formatSummary, formatLoading, formatError } from './utils/format.js';
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
    .action(async (textArray: string[], options: {
      examples?: boolean;
      phonetic?: boolean;
      maxExamples?: string;
      plugin?: string;
      config?: string;
    }) => {
      const loading = ora({
        text: formatLoading('正在查询'),
        spinner: 'dots'
      }).start();

      try {
        // 将数组合并为字符串
        const text = textArray.join(' ');

        const config = await loadConfig(options.config);

        // 命令行选项覆盖配置文件
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

        const results = await translate(text, config);

        loading.stop();

        // 打印汇总信息
        console.log(formatSummary(results));

        // 打印每个结果
        for (const result of results) {
          console.log(formatResult(result, config.showPhonetic, config.showExamples, config.maxExamples));
        }
      } catch (error) {
        loading.stop();
        console.error(formatError(error instanceof Error ? error.message : '未知错误'));
        process.exit(1);
      }
    });

  program.parse();
}

// 直接执行 run 函数
run().catch(error => {
  console.error(chalk.red(`错误: ${error instanceof Error ? error.message : '未知错误'}`));
  process.exit(1);
}); 
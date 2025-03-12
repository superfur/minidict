#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import type { TranslationResult, MDOutput, MDError } from './types.js';

export async function run(): Promise<void> {
  program
    .name('dict')
    .description('一个简单的命令行词典工具')
    .version(pkg.version);

  program
    .argument('<word>', '要查询的单词')
    .option('-p, --plugin <plugin>', '指定词典插件 (bing/youdao)', 'bing')
    .option('--phonetic', '显示音标', false)
    .option('--examples', '显示例句')
    .option('--max-examples <number>', '最大例句数量', '3')
    .option('--config <path>', '配置文件路径')
    .action(async (word: string, options: { examples?: boolean; config?: string }) => {
      try {
        const config = await loadConfig(options.config);
        const results = await translate(word, config.plugins);

        for (const result of results) {
          console.log(chalk.bold(`\n= ${result.pluginName} =\n`));
          console.log(result.word);

          if (result.phonetic) {
            if (typeof result.phonetic === 'string') {
              console.log(chalk.gray(`[${result.phonetic}]`));
            } else {
              if (result.phonetic.uk) {
                console.log(chalk.gray(`英 [${result.phonetic.uk}]`));
              }
              if (result.phonetic.us) {
                console.log(chalk.gray(`美 [${result.phonetic.us}]`));
              }
            }
          }

          if (result.translations.length > 0) {
            console.log('\n翻译:');
            for (const trans of result.translations) {
              if (trans.startsWith('网络')) {
                console.log(chalk.gray(`- ${trans}`));
              } else {
                console.log(chalk.green(`- ${trans}`));
              }
            }
          }

          if (options.examples && result.examples && result.examples.length > 0) {
            console.log('\n例句:');
            result.examples.forEach((example, index) => {
              console.log(chalk.cyan(`${index + 1}.`));
              console.log(chalk.blue(example.en));
              console.log(chalk.gray(example.zh));
              if (index < result.examples!.length - 1) {
                console.log();
              }
            });
          }
        }
      } catch (error) {
        console.error(chalk.red(`\n错误: ${error instanceof Error ? error.message : '未知错误'}`));
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
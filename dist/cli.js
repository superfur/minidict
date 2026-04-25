#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
const modRequire = createRequire(import.meta.url);
const pkg = modRequire('../package.json');
import { translate } from './translate.js';
import { loadConfig } from './config.js';
import { formatHeader, formatResult, formatErrorResult, formatSummary } from './utils/format.js';
export async function run() {
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
        .action(async (textArray, options) => {
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
        const startTime = Date.now();
        const results = [];
        let firstPhonetic = null;
        await translate(text, config, (result) => {
            results.push(result);
            if (!firstPhonetic && !result.error && config.showPhonetic && result.phonetic) {
                firstPhonetic = result.phonetic;
            }
        });
        console.log(formatHeader(text, config.showPhonetic ? firstPhonetic : undefined));
        console.log('');
        for (const result of results) {
            if (result.error) {
                console.log(formatErrorResult(result));
            }
            else {
                console.log(formatResult(result, false, config.showExamples, config.maxExamples));
            }
        }
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

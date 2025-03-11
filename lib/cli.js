"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const update_notifier_1 = __importDefault(require("update-notifier"));
const translator_1 = require("./core/translator");
const config_1 = require("./utils/config");
const package_json_1 = __importDefault(require("../package.json"));
async function run() {
    // 检查更新
    const notifier = (0, update_notifier_1.default)({ pkg: package_json_1.default });
    notifier.notify();
    const program = new commander_1.Command();
    program
        .name('dict')
        .description('一个简单易用的命令行词典工具')
        .version(package_json_1.default.version, '-v, --version')
        .argument('[word]', '要查询的单词')
        .option('-p, --no-phonetic', '不显示音标')
        .option('-e, --no-examples', '不显示例句')
        .action(async (word) => {
        if (!word) {
            program.help();
            return;
        }
        try {
            const config = await (0, config_1.getConfig)();
            const result = await (0, translator_1.translate)(word, config);
            // 输出结果
            console.log(`\n${chalk_1.default.green('✓')} 查询: ${chalk_1.default.bold(word)}`);
            if (result.phonetic && config.showPhonetic) {
                console.log(chalk_1.default.gray(`音标: [${result.phonetic}]`));
            }
            console.log('\n释义:');
            result.translations.forEach((trans) => {
                console.log(chalk_1.default.cyan(`  • ${trans}`));
            });
            if (result.examples && result.examples.length > 0 && config.showExamples) {
                console.log('\n例句:');
                result.examples.slice(0, config.maxExamples).forEach((example) => {
                    console.log(chalk_1.default.yellow(`  • ${example}`));
                });
            }
            console.log(`\n${chalk_1.default.gray(`来源: ${result.source}`)}\n`);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(chalk_1.default.red('错误:'), error.message);
            }
            else {
                console.error(chalk_1.default.red('错误:'), '未知错误');
            }
            process.exit(1);
        }
    });
    program.parse();
}

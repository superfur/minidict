"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.template = void 0;
const chalk_1 = require("chalk");
const unicons = require("unicons");
const stringBreak = require("string-break");
const cliWidth = require("cli-width");
const pad = require("pad");
const config_1 = require("../utils/config");
chalk_1.default.enabled = typeof config_1.default.colorful === 'boolean'
    ? config_1.default.colorful
    : true;
function highlight(str, words) {
    const regexp = new RegExp(words, 'ig');
    return str.replace(regexp, substr => {
        return chalk_1.default.red(substr);
    });
}
function formatExample(str, words, firstLineIndent, indent) {
    const exampleWidth = cliWidth() - 14;
    if (exampleWidth <= 0) {
        return firstLineIndent + str;
    }
    return stringBreak(str, exampleWidth)
        .map((line, index) => {
        let highlightLine = highlight(line, words);
        return index === 0
            ? firstLineIndent + highlightLine
            : indent + highlightLine;
    })
        .join('\n');
}
function template(data) {
    let result = [''];
    let count = 0;
    data.forEach(item => {
        const circle = unicons.cli('circle');
        const pluginName = chalk_1.default.blue.bold(item.pluginName);
        const url = chalk_1.default.cyan.underline(item.url);
        const hasPhonetics = item.phonetics && item.phonetics.length;
        const hasTranslates = item.translates && item.translates.length;
        const hasExamples = item.examples && item.examples.length;
        if (hasPhonetics || hasTranslates || hasExamples) {
            result.push(`  ${circle} ${pluginName}   ${url}`);
            result.push('');
            count++;
        }
        if (hasPhonetics) {
            let phoneticLine = '    ';
            item.phonetics.forEach(phonetic => {
                let value = chalk_1.default.gray.bold(phonetic.value);
                if (phonetic.type) {
                    const type = chalk_1.default.red(phonetic.type);
                    phoneticLine += `${type} ${value}  `;
                }
                else {
                    phoneticLine += `${value}  `;
                }
            });
            result.push(phoneticLine + '');
            result.push('');
        }
        if (hasTranslates) {
            item.translates.forEach(translate => {
                let trans = translate.trans;
                if (translate.type) {
                    let type = chalk_1.default.yellow(pad(translate.type, 8));
                    result.push(`    ${type} ${trans}`);
                }
                else {
                    result.push(`    ${trans}`);
                }
            });
            result.push('');
        }
        if (hasExamples) {
            result.push(`    ${chalk_1.default.green('例句:')}`);
            item.examples.forEach(example => {
                let fromFirstLineIndent = `    ${chalk_1.default.yellow.bold('+')} `;
                let toFirstLineIndent = `    ${chalk_1.default.green.bold('-')} `;
                let indent = '      ';
                let fromStr = formatExample(example.from, item.words, fromFirstLineIndent, indent);
                let toStr = formatExample(example.to, item.words, toFirstLineIndent, indent);
                result.push('');
                result.push(fromStr);
                result.push(toStr);
            });
            result.push('');
        }
    });
    if (!count) {
        result = [
            '',
            chalk_1.default.red(`  ${unicons.cli('cross')} 没有查询到任何结果!`),
            ''
        ];
    }
    return result.join('\n');
}
exports.template = template;
//# sourceMappingURL=index.js.map
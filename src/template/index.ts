import chalk from 'chalk';
import * as unicons from 'unicons';
import * as stringBreak from 'string-break';
import * as cliWidth from 'cli-width';
import * as pad from 'pad';

import config from '../utils/config';

chalk.enabled = typeof config.colorful === 'boolean'
  ? config.colorful
  : true;

/**
 * 高亮关键字
 */
function highlight(str, words) {
  const regexp = new RegExp(words, 'ig');

  return str.replace(regexp, substr => {
    return chalk.red(substr);
  });
}

/**
 * 格式化例句
 */
function formatExample(str, words, firstLineIndent, indent) {
  const exampleWidth = cliWidth() - 14;

  // 兼容 windows 上 git-bash 等
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

/**
 * 输出模板
 * @param {*} data 
 */
export function template(data) {
  let result = [''];
  let count = 0;

  
  // 输出翻译信息
  data.forEach(item => {
    const circle = unicons.cli('circle');
    const pluginName = chalk.blue.bold(item.pluginName);
    const url = chalk.cyan.underline(item.url);

    const hasPhonetics = item.phonetics && item.phonetics.length;
    const hasTranslates = item.translates && item.translates.length;
    const hasExamples = item.examples && item.examples.length;

    /**
     * 标题
     */
    if (hasPhonetics || hasTranslates || hasExamples) {
      result.push(`  ${circle} ${pluginName}   ${url}`);
      result.push('');
      count++;
    }

    /**
     * 音标
     */
    if (hasPhonetics) {
      let phoneticLine = '    ';
      item.phonetics.forEach(phonetic => {
        let value = chalk.gray.bold(phonetic.value);
        if (phonetic.type) {
          const type = chalk.red(phonetic.type);
          phoneticLine += `${type} ${value}  `;
        } else {
          phoneticLine += `${value}  `;
        }
      });
      result.push(phoneticLine + '');
      result.push('');
    }

    /**
     * 翻译
     */
    if (hasTranslates) {
      item.translates.forEach(translate => {
        let trans = translate.trans;

        if (translate.type) {
          let type = chalk.yellow(pad(translate.type, 8));
          result.push(`    ${type} ${trans}`);
        } else {
          result.push(`    ${trans}`);
        }
        // const value = chalk.yellow(translate);
        // result.push(`    ${value}`);
      });
      result.push('');
    }

    /**
     * 例句
     */
    if (hasExamples) {
      result.push(`    ${chalk.green('例句:')}`);

      item.examples.forEach(example => {
        let fromFirstLineIndent = `    ${chalk.yellow.bold('+')} `;
        let toFirstLineIndent = `    ${chalk.green.bold('-')} `;
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
      chalk.red(`  ${unicons.cli('cross')} 没有查询到任何结果!`),
      ''
    ];
  }

  return result.join('\n');
}

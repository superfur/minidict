import * as cheerio from 'cheerio';
import { MDOutput, Phonetic, Translate, CODES, MDError } from '../../output'; 

let $;

export default function main(html) {
  try {
    return parser(html);
  } catch (e) {
    return new MDError(CODES.PARSE_ERROR, e.message);
  }
}

/**
 * 解析 HTML
 *
 * @param {*} html
 * @returns {MDOutput}
 */
function parser(html): MDOutput {
  $ = cheerio.load(html, {
    decodeEntities: false
  });

  const $container = $('#phrsListTab');
  const output = new MDOutput(CODES.SUCCESS, '搜索成功');

  /**
   * container 为空，可能是：
   * 1.中英混合单词
   * 2.错误页
   */
  if ((!$container || !$container.length)) {
    return output;
  }

  output.phonetics = _parsePhonetics($container);
  output.translates = _parseTrans($container);

  return output;
}

/**
 * 音标
 * @param {*}
 */
function _parsePhonetics(node): Phonetic[] {
  const phonetics = [];

  node.find('.pronounce').each((index, item) => {
    const type = $(item).text().slice(0, 1);
    const value = $(item).find('.phonetic').text();
    phonetics.push(new Phonetic(type, value));
  });

  return phonetics;
}

/**
 * 翻译
 * @param {*} node
 */
function _parseTrans(node): Translate[] {
  const translates = [];

  node.find('li').each((index, item) => {
    const content = $(item).text().split(' ');
    const type = content[0];
    const trans = content[1];
    translates.push(new Translate(type, trans));
  });

  if (!translates.length) {
    node.find('.contentTitle a').each((index, item) => {
      const content = $(item).html();
      translates.push(content);
    });
  }
  return translates;
}


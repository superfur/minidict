'use strict';

const cheerio = require('cheerio');
// const { Output, Phonetics, Translate, CODES } = require('../../output');

function removeTagsAndSpaces(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  return html
    .replace(/<[^>]+?>/gm, '') // 移除 html 标签
    .replace(/\s+/gm, ' ') // 合并空格
    .trim();
}

let $;

function main(html) {
  try {
    return parser(html);
  } catch (e) {
    // return new EDOutput(CODES.PARSE_ERROR, e.message);
  }
}

/**
 * 解析 HTML
 */
function parser(html) {
  $ = cheerio.load(html, {
    decodeEntities: false
  });

  const $containor = $('#phrsListTab');
  // const $suggestContainor = $('#results-contents');

  const output = {};

  output.phonetics = _parsePhonetics($containor);
  output.trans = _parseTrans($containor);

  return output;
}

/**
 * 音标
 * @param {*}
 */
function _parsePhonetics(node) {
  const phonetics = [];

  node.find('.phonetic').each((index, item) => {
    const content = $(item).text();
    phonetics.push(content);
  });

  return phonetics;
}

/**
 * 翻译
 * @param {*} node
 */
function _parseTrans(node) {
  const trans = [];

  node.find('li').each((index, item) => {
    const content = $(item).text();
    trans.push(content);
  });

  if (!trans.length) {
    node.find('.contentTitle a').each((index, item) => {
      const content = $(item).html();
      trans.push(content);
    });
  }
  return trans;
}

module.exports = main;

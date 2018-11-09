
'use strict';

const search = require('./service');
const template = require('./template');
const moment = require('moment');
const { start, success, fail } = require('./template/loader');

/**
 * 单词查询
 */
async function translate(words, type) {
  const startTime = Date.now();
  words = Array.isArray(words) ? words : [words];
  words = words
    .map(word => word.trim())
    .join(' ')
    .slice(0, 240); // 限制长度
  
  start();
  try {
    const data = await search(words, type);
    const output = template(data);

    const endTime = Date.now(); // 查询结束时间
    const duration = moment.duration(endTime - startTime).asSeconds(); // 耗时

    success(`Translate "${words}" in ${duration}s:`);
    console.log(output);
  } catch (err) {
    fail();
    console.error(err);
  }
  
};

module.exports = translate;


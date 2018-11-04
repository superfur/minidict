const fetch = require('./lib/fetch');
const parser = require('./lib/parser');
const { start, success, fail } = require('../../template/loader');

const main = async str => {
  start();
  if (!str) Promise.reject(new Error('请输入要查询的文字'));

  const keywords = encodeURIComponent(str);
  const url = `http://www.youdao.com/w/eng/${keywords}`;
  const body = await fetch(url);
  try {
    success(`您查询的单词是："${str}"`);
    return parser(body);
  } catch (e) {
    fail()
    console.error(e)
  }
};

module.exports = main;

const fetch = require('./lib/fetch');
const parser = require('./lib/parser');

async function main(words) {
  if (!words) Promise.reject(new Error('请输入要查询的文字'));

  const keywords = encodeURIComponent(words);
  const url = `http://www.youdao.com/w/eng/${keywords}`;
  const body = await fetch(url);
  try {
    return parser(body);
  } catch (err) {
    console.error(err);
  }
};

module.exports = main;

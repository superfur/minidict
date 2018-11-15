const fetch = require('./lib/fetch');
const parser = require('./lib/parser');

async function main(words) {
  if (!words) Promise.reject(new Error('请输入要查询的文字'));

  const keywords = encodeURIComponent(words);
  const url = `https://cn.bing.com/dict/search?q=${keywords}`;
  return fetch(url)
    .then(body => parser(body))
    .catch(err => {
      console.error(err);
    })
    .then(output => {
      output.pluginName = 'Bing';
      // output.packageName = pkg.name;
      output.words = words;
      output.url = url;
      return output;
    });
};

module.exports = main;

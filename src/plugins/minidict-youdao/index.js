const fetch = require('./lib/fetch');
const parser = require('./lib/parser');

function main(words) {
  if (!words) Promise.reject(new Error('请输入要查询的文字'));

  const keywords = encodeURIComponent(words);
  const url = `http://www.youdao.com/w/${keywords}`;

  return fetch(url)
    .then(body => parser(body))
    .catch(err => {
      console.error(err);
    })
    .then(output => {
      output.pluginName = 'Youdao';
      // output.packageName = pkg.name;
      output.words = words;
      output.url = url;
      return output;
    });
};


module.exports = main;

const youdao = require('../plugins/youdao');

const onlineSearch = (str, type) => {
  switch (type) {
    case 'bing':
      return bing(str)
    case 'youdao':
    default:
      return youdao(str)
  }
};

module.exports = onlineSearch;

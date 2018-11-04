const onlineSearch = require('./service');
const template = require('./template');

const search = async (words, type = 'youdao') => {
  const str = words.join(' ');
  const data = await onlineSearch(str, type);
  template(data);
};

module.exports = search;

/**
 * 输出模板
 * @param {字典数据} data
 */
const template = (data) => {
  const { phonetics, trans } = data;
  console.log(phonetics.join(' '));
  trans.forEach(el => {
    console.log(el);
  });
};

module.exports = template;

'use strict';

/**
 * 词典标准输出对象
 */
class Output {
  constructor(code, message) {
    // 插件显示的名称
    this.pluginName = '';

    // 插件的包名称
    this.packageName = '';

    // 查询的单词 & 短语
    this.words = '';

    // 在线地址
    this.url = '';

    // 音标 & 翻译 & 例句 & 搜索建议
    this.phonetics = [];
    this.translates = [];

    // 错误信息
    this.error = new EDError(code, message);
  }
}

/**
 * 音标
 */
class Phonetic {
  constructor(type, value) {
    // 音标类型，例如 美
    this.type = type;

    // 音标值，例如 [həˈləʊ]
    this.value = value;
  }
}

/**
 * 翻译
 */
class Translate {
  constructor(type, trans) {
    // 词性，例如 n vt
    this.type = type;

    // 翻译
    this.trans = trans;
  }
}

const CODES = {
  SUCCESS: 0,
  0: 'SUCCESS',

  1: 'NETWORK_ERROR',
  NETWORK_ERROR: 1,

  2: 'PARSE_ERROR',
  PARSE_ERROR: 2,

  99: 'OTHER',
  OTHER: 99
};

// module.exports = Output;

module.exports.Output = Output;
module.exports.Phonetic = Phonetic;
module.exports.Translate = Translate;
module.exports.CODES = CODES;

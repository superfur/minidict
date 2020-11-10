"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("./lib/fetch");
const parser_1 = require("./lib/parser");
function main(words) {
    if (!words)
        Promise.reject(new Error('请输入要查询的文字'));
    const keywords = encodeURIComponent(words);
    const url = `http://www.youdao.com/w/${keywords}`;
    return fetch_1.default(url)
        .then(body => parser_1.default(body))
        .catch(err => {
        console.error(err);
    })
        .then(output => {
        output.pluginName = 'Youdao';
        output.words = words;
        output.url = url;
        return output;
    });
}
;
module.exports = main;
//# sourceMappingURL=index.js.map
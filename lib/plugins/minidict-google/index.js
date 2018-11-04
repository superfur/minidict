"use strict";
const fetch = require('./lib/fetch');
const parser = require('./lib/parser');
const getFetchData = (text, token) => {
    let from, to;
    if (/[\u4e00-\u9fa5]/.test(text)) {
        from = 'zh-CN';
        to = 'en';
    }
    else {
        from = 'en';
        to = 'zh-CN';
    }
    return {
        client: 't',
        sl: from,
        tl: to,
        hl: 'zh-CN',
        dt: [
            'at', 'bd', 'ex', 'ld', 'md',
            'qca', 'rw', 'rm', 'ss', 't'
        ],
        ie: 'UTF-8',
        oe: 'UTF-8',
        otf: 1,
        ssel: 0,
        tsel: 0,
        kc: 4,
        tk: token,
        q: text
    };
};
async function main(words) {
    if (!words)
        Promise.reject(new Error('请输入要查询的文字'));
    const keywords = encodeURIComponent(words);
    const url = `https://translate.google.com/?hl=zh-TW#en/zh-TW/${keywords}`;
    return fetch(url)
        .then(body => parser(body))
        .catch(err => {
        console.error(err);
    })
        .then(output => {
        output.pluginName = 'Bing';
        output.words = words;
        output.url = url;
        return output;
    });
}
;
module.exports = main;
//# sourceMappingURL=index.js.map
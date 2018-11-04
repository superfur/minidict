'use strict';
const cheerio = require('cheerio');
function removeTagsAndSpaces(html) {
    if (!html || typeof html !== 'string') {
        return html;
    }
    return html
        .replace(/<[^>]+?>/gm, '')
        .replace(/\s+/gm, ' ')
        .trim();
}
let $;
function main(html) {
    try {
        return parser(html);
    }
    catch (e) {
    }
}
function parser(html) {
    $ = cheerio.load(html, {
        decodeEntities: false
    });
    const $containor = $('.qdef');
    const output = {};
    if ((!$containor || !$containor.length)) {
        return output;
    }
    output.pluginName = 'bing';
    output.phonetics = _parsePhonetics($containor);
    output.trans = _parseTrans($containor);
    return output;
}
function _parsePhonetics(node) {
    const phonetics = [];
    node.find('.hd_prUS, .hd_pr').each((index, item) => {
        const content = $(item).text();
        phonetics.push(content);
    });
    return phonetics;
}
function _parseTrans(node) {
    const trans = [];
    node.find('li').each((index, item) => {
        const content = $(item).text();
        trans.push(content);
    });
    if (!trans.length) {
        node.find('.contentTitle a').each((index, item) => {
            const content = $(item).html();
            trans.push(content);
        });
    }
    return trans;
}
module.exports = main;
//# sourceMappingURL=parser.js.map
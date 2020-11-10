"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = require("cheerio");
const output_1 = require("../../output");
let $;
function main(html) {
    try {
        return parser(html);
    }
    catch (e) {
        return new output_1.MDError(output_1.CODES.PARSE_ERROR, e.message);
    }
}
exports.default = main;
function parser(html) {
    $ = cheerio.load(html, {
        decodeEntities: false
    });
    const $container = $('.qdef');
    const output = new output_1.MDOutput(output_1.CODES.SUCCESS, '搜索成功');
    if ((!$container || !$container.length)) {
        return output;
    }
    output.pluginName = 'bing';
    output.phonetics = _parsePhonetics($container);
    output.translates = _parseTrans($container);
    return output;
}
function _parsePhonetics(node) {
    const phonetics = [];
    node.find('.hd_prUS, .hd_pr').each((index, item) => {
        const content = $(item).text().split(' ');
        const type = content[0];
        const value = content[1];
        phonetics.push(new output_1.Phonetic(type, value));
    });
    return phonetics;
}
function _parseTrans(node) {
    const translates = [];
    node.find('li').each((index, item) => {
        const type = $(item).find('.pos').text();
        const trans = $(item).find('.def').text();
        translates.push(new output_1.Translate(type, trans));
    });
    if (!translates.length) {
        node.find('.contentTitle a').each((index, item) => {
            const content = $(item).html();
            translates.push(content);
        });
    }
    return translates;
}
//# sourceMappingURL=parser.js.map
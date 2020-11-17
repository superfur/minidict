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
    const $container = $('#phrsListTab');
    const output = new output_1.MDOutput(output_1.CODES.SUCCESS, '搜索成功');
    if ((!$container || !$container.length)) {
        return output;
    }
    output.phonetics = _parsePhonetics($container);
    output.translates = _parseTrans($container);
    return output;
}
function _parsePhonetics(node) {
    const phonetics = [];
    node.find('.pronounce').each((index, item) => {
        const type = $(item).text().slice(0, 1);
        const value = $(item).find('.phonetic').text();
        phonetics.push(new output_1.Phonetic(type, value));
    });
    return phonetics;
}
function _parseTrans(node) {
    const translates = [];
    node.find('li').each((index, item) => {
        const content = $(item).text().split(' ');
        const type = content[0];
        const trans = content[1];
        translates.push(new output_1.Translate(type, trans));
    });
    node.find('.wordGroup').each((index, item) => {
        if ($(item).find('span').length === 2) {
            const type = $(item).find('span').first().text();
            const trans = $(item).find('.contentTitle').text();
            translates.push(new output_1.Translate(type, trans));
        }
        else if ($(item).find('.contentTitle').length > 1) {
            $(item).find('.contentTitle').each((index, item) => {
                const trans = $(item).find('a').text();
                translates.push(new output_1.Translate('', trans));
            });
        }
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
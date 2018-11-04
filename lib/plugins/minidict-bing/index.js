"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fetch_1 = __importDefault(require("node-fetch"));
const parser_1 = require("./lib/parser");
async function main(words) {
    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(words)}`;
    try {
        const response = await (0, node_fetch_1.default)(url);
        const html = await response.text();
        const output = (0, parser_1.parse)(html);
        if ('code' in output) {
            throw new Error(output.message);
        }
        output.pluginName = 'Bing';
        output.words = words;
        output.url = url;
        return output;
    }
    catch (err) {
        throw new Error(err instanceof Error ? err.message : '未知错误');
    }
}
module.exports = main;
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = translate;
const google_1 = require("../plugins/google");
const bing_1 = require("../plugins/bing");
const youdao_1 = require("../plugins/youdao");
const plugins = {
    google: new google_1.GoogleTranslator(),
    bing: new bing_1.BingTranslator(),
    youdao: new youdao_1.YoudaoTranslator()
};
async function translate(word, config) {
    const plugin = plugins[config.plugins[0]];
    if (!plugin) {
        throw new Error(`未找到词典插件: ${config.plugins[0]}`);
    }
    return plugin.translate(word);
}

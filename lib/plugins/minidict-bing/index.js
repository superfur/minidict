"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("./lib/fetch");
const parser_1 = require("./lib/parser");
function main(words) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!words)
            Promise.reject(new Error('请输入要查询的文字'));
        const keywords = encodeURIComponent(words);
        const url = `https://cn.bing.com/dict/search?q=${keywords}`;
        return fetch_1.default(url)
            .then(body => parser_1.default(body))
            .catch(err => {
            console.error(err);
        })
            .then(output => {
            output.pluginName = 'Bing';
            output.words = words;
            output.url = url;
            return output;
        });
    });
}
;
module.exports = main;
//# sourceMappingURL=index.js.map
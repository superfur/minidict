"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoudaoTranslator = void 0;
const axios_1 = __importDefault(require("axios"));
class YoudaoTranslator {
    constructor() {
        this.name = 'youdao';
    }
    async translate(word) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!word) {
            throw new Error('翻译内容不能为空');
        }
        try {
            const response = await axios_1.default.get(`https://dict.youdao.com/jsonapi`, {
                params: { q: word },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });
            const data = response.data;
            const translations = [];
            const examples = [];
            let phonetic;
            // 处理英译中
            if ((_b = (_a = data.ec) === null || _a === void 0 ? void 0 : _a.word) === null || _b === void 0 ? void 0 : _b[0]) {
                const wordInfo = data.ec.word[0];
                phonetic = wordInfo.usphone;
                (_c = wordInfo.trs) === null || _c === void 0 ? void 0 : _c.forEach((tr) => {
                    translations.push(...tr.tr);
                });
                (_d = data.ec.sentence) === null || _d === void 0 ? void 0 : _d.forEach((sen) => {
                    examples.push({
                        en: sen.sentence,
                        zh: sen.translation
                    });
                });
            }
            // 处理中译英
            if ((_f = (_e = data.ce) === null || _e === void 0 ? void 0 : _e.word) === null || _f === void 0 ? void 0 : _f[0]) {
                const wordInfo = data.ce.word[0];
                phonetic = wordInfo.phone;
                (_g = wordInfo.trs) === null || _g === void 0 ? void 0 : _g.forEach((tr) => {
                    translations.push(...tr.tr);
                });
                (_h = data.ce.sentence) === null || _h === void 0 ? void 0 : _h.forEach((sen) => {
                    examples.push({
                        en: sen.translation,
                        zh: sen.sentence
                    });
                });
            }
            if (!translations.length) {
                throw new Error('未找到翻译结果');
            }
            return {
                word,
                translations,
                phonetic,
                examples,
                source: 'Youdao Dictionary'
            };
        }
        catch (error) {
            if (error.message === '未找到翻译结果') {
                throw error;
            }
            throw new Error('有道词典服务暂时不可用');
        }
    }
}
exports.YoudaoTranslator = YoudaoTranslator;

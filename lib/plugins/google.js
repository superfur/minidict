"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleTranslator = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleTranslator {
    constructor() {
        this.name = 'google';
    }
    async translate(word) {
        var _a;
        if (!word) {
            throw new Error('翻译内容不能为空');
        }
        try {
            const response = await axios_1.default.get(`https://translate.googleapis.com/translate_a/single`, {
                params: {
                    client: 'gtx',
                    sl: 'auto',
                    tl: 'zh-CN',
                    dt: ['t', 'rm'],
                    q: word
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });
            const [translations, , phonetics] = response.data;
            return {
                word,
                phonetic: ((_a = phonetics === null || phonetics === void 0 ? void 0 : phonetics[0]) === null || _a === void 0 ? void 0 : _a[2]) || undefined,
                translations: translations.map((t) => t[0]).filter(Boolean),
                source: 'Google Translate'
            };
        }
        catch (error) {
            throw new Error('Google 翻译服务暂时不可用');
        }
    }
}
exports.GoogleTranslator = GoogleTranslator;

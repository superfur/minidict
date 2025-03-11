"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BingTranslator = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class BingTranslator {
    constructor() {
        this.name = 'bing';
    }
    async translate(word) {
        if (!word) {
            throw new Error('翻译内容不能为空');
        }
        try {
            const response = await axios_1.default.get(`https://cn.bing.com/dict/search`, {
                params: { q: word },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const translations = [];
            const examples = [];
            // 获取音标
            const phonetic = $('.hd_tf_lh .b_primtxt').text() || undefined;
            // 获取翻译
            $('.def_area ul li').each((_, el) => {
                translations.push($(el).text().trim());
            });
            // 获取例句
            $('.se_li1').each((_, el) => {
                const en = $(el).find('.sen_en').text().trim();
                const zh = $(el).find('.sen_cn').text().trim();
                if (en && zh) {
                    examples.push({ en, zh });
                }
            });
            if (!translations.length) {
                throw new Error('未找到翻译结果');
            }
            return {
                word,
                translations,
                phonetic,
                examples,
                source: 'Bing Dictionary'
            };
        }
        catch (error) {
            if (error.message === '未找到翻译结果') {
                throw error;
            }
            throw new Error('Bing 词典服务暂时不可用');
        }
    }
}
exports.BingTranslator = BingTranslator;

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const cheerio = __importStar(require("cheerio"));
function parse(html) {
    if (!html) {
        return {
            code: 500,
            message: '解析失败：HTML 为空'
        };
    }
    const $ = cheerio.load(html);
    const output = {
        pluginName: '',
        words: '',
        url: '',
        phonetics: [],
        translations: [],
        examples: []
    };
    $('#phrsListTab .pronounce').each((_, element) => {
        const phoneticText = $(element).text().trim();
        const match = phoneticText.match(/(\[.+?\])/);
        if (match) {
            const type = phoneticText.includes('美') ? '美' : '英';
            output.phonetics?.push({
                type,
                value: match[1]
            });
        }
    });
    $('#phrsListTab .trans-container li').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
            const parts = text.split('.');
            const type = parts.length > 1 ? parts[0] : '';
            const trans = parts.length > 1 ? parts.slice(1).join('.').trim() : text;
            output.translations?.push({
                type,
                trans
            });
        }
    });
    $('#bilingual li').each((_, element) => {
        const english = $(element).find('.en').text().trim();
        const chinese = $(element).find('.cn').text().trim();
        if (english)
            output.examples?.push(english);
        if (chinese)
            output.examples?.push(chinese);
    });
    if (!output.translations?.length && !output.examples?.length) {
        return {
            code: 404,
            message: '未找到翻译结果'
        };
    }
    return output;
}
//# sourceMappingURL=parser.js.map
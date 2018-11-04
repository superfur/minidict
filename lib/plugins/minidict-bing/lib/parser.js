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
    $('.hd_prUS, .hd_pr').each((_, element) => {
        const type = $(element).hasClass('hd_prUS') ? '美' : '英';
        const value = $(element).text().trim();
        if (value) {
            output.phonetics?.push({ type, value });
        }
    });
    $('.qdef > ul > li').each((_, element) => {
        const type = $(element).find('.pos').text().trim();
        const trans = $(element).find('.def').text().trim();
        if (type && trans) {
            output.translations?.push({ type, trans });
        }
    });
    $('.sen_en, .sen_cn').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
            output.examples?.push(text);
        }
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
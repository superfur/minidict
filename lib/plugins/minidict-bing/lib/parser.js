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
    var _a, _b;
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
    // 解析音标
    $('.hd_prUS, .hd_pr').each((_, element) => {
        var _a;
        const type = $(element).hasClass('hd_prUS') ? '美' : '英';
        const value = $(element).text().trim();
        if (value) {
            (_a = output.phonetics) === null || _a === void 0 ? void 0 : _a.push({ type, value });
        }
    });
    // 解析翻译
    $('.qdef > ul > li').each((_, element) => {
        var _a;
        const type = $(element).find('.pos').text().trim();
        const trans = $(element).find('.def').text().trim();
        if (type && trans) {
            (_a = output.translations) === null || _a === void 0 ? void 0 : _a.push({ type, trans });
        }
    });
    // 解析例句
    $('.sen_en, .sen_cn').each((_, element) => {
        var _a;
        const text = $(element).text().trim();
        if (text) {
            (_a = output.examples) === null || _a === void 0 ? void 0 : _a.push(text);
        }
    });
    if (!((_a = output.translations) === null || _a === void 0 ? void 0 : _a.length) && !((_b = output.examples) === null || _b === void 0 ? void 0 : _b.length)) {
        return {
            code: 404,
            message: '未找到翻译结果'
        };
    }
    return output;
}

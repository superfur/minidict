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
exports.template = template;
const stringBreak = __importStar(require("string-break"));
const pad = __importStar(require("pad"));
const highlight_1 = require("./highlight");
function formatLine(str, words, firstLineIndent = '') {
    const breakOptions = {
        width: 80,
        firstLineIndent,
        indent: ' '.repeat(firstLineIndent.length)
    };
    return stringBreak(str, breakOptions)
        .split('\n')
        .map((line, index) => {
        return index === 0 ? line : pad(line, line.length + firstLineIndent.length);
    })
        .map((line) => (0, highlight_1.highlight)(line, words))
        .join('\n');
}
function template(data) {
    if (!data || !data.length) {
        return '未找到翻译结果';
    }
    return data.map(item => {
        const lines = [];
        const words = item.words;
        // 添加标题
        lines.push(`\n# ${item.pluginName}`);
        lines.push(`${item.url}\n`);
        // 添加音标
        if (item.phonetics && item.phonetics.length) {
            const phoneticStr = item.phonetics
                .map(p => `${p.type}. [${p.value}]`)
                .join('  ');
            lines.push(formatLine(phoneticStr, words));
        }
        // 添加翻译
        if (item.translations && item.translations.length) {
            lines.push('');
            item.translations.forEach(t => {
                const transStr = t.type ? `${t.type}. ${t.trans}` : t.trans;
                lines.push(formatLine(transStr, words, '  '));
            });
        }
        // 添加例句
        if (item.examples && item.examples.length) {
            lines.push('\n例句:');
            item.examples.forEach(example => {
                lines.push(formatLine(example, words, '  '));
            });
        }
        return lines.join('\n');
    }).join('\n');
}

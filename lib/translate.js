"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = translate;
const service_1 = require("./service");
const template_1 = require("./template");
const loader_1 = require("./template/loader");
async function translate(words, type) {
    if (!words || words.length === 0) {
        console.error('请输入要翻译的内容');
        return;
    }
    const startTime = Date.now();
    const sentence = words
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .join(' ')
        .slice(0, 240);
    if (!sentence) {
        console.error('输入内容无效');
        return;
    }
    (0, loader_1.start)();
    try {
        const data = await (0, service_1.search)(sentence, type);
        const output = (0, template_1.template)(data);
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        (0, loader_1.success)(`翻译 "${sentence}" 完成 (用时: ${duration.toFixed(2)}秒):`);
        console.log(output);
    }
    catch (err) {
        (0, loader_1.fail)();
        if (err instanceof Error) {
            console.error('翻译出错:', err.message);
        }
        else {
            console.error('翻译过程中发生未知错误');
        }
    }
}
;
//# sourceMappingURL=translate.js.map
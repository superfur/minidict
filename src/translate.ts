import * as moment from 'moment';
import { search } from './service';
import { template } from './template';
import { start, success, fail } from './template/loader';
import { DictionaryType } from './utils/const';

/**
 * 单词查询
 * @param words 要翻译的词或句子
 * @param type 字典类型
 */
export async function translate(words: string[], type: Record<string, boolean>) {
    // 输入验证
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

    start();
    try {
        const data = await search(sentence, type);
        const output = template(data);

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        success(`翻译 "${sentence}" 完成 (用时: ${duration.toFixed(2)}秒):`);
        console.log(output);
    } catch (err) {
        fail();
        if (err instanceof Error) {
            console.error('翻译出错:', err.message);
        } else {
            console.error('翻译过程中发生未知错误');
        }
    }
};

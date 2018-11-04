import * as cheerio from 'cheerio';
import { MDOutput, MDError } from '../../../types';

export function parse(html: string): MDOutput | MDError {
    if (!html) {
        return {
            code: 500,
            message: '解析失败：HTML 为空'
        };
    }

    const $ = cheerio.load(html);
    const output: MDOutput = {
        pluginName: '',
        words: '',
        url: '',
        phonetics: [],
        translations: [],
        examples: []
    };

    // 解析音标
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

    // 解析翻译
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

    // 解析例句
    $('#bilingual li').each((_, element) => {
        const english = $(element).find('.en').text().trim();
        const chinese = $(element).find('.cn').text().trim();
        if (english) output.examples?.push(english);
        if (chinese) output.examples?.push(chinese);
    });

    if (!output.translations?.length && !output.examples?.length) {
        return {
            code: 404,
            message: '未找到翻译结果'
        };
    }

    return output;
}


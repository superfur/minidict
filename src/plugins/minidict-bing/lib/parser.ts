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
    $('.hd_prUS, .hd_pr').each((_, element) => {
        const type = $(element).hasClass('hd_prUS') ? '美' : '英';
        const value = $(element).text().trim();
        if (value) {
            output.phonetics?.push({ type, value });
        }
    });

    // 解析翻译
    $('.qdef > ul > li').each((_, element) => {
        const type = $(element).find('.pos').text().trim();
        const trans = $(element).find('.def').text().trim();
        if (type && trans) {
            output.translations?.push({ type, trans });
        }
    });

    // 解析例句
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

import { parse } from './parser.js';
import fetch from 'node-fetch';
export class YoudaoTranslator {
    async translate(word) {
        try {
            // 检查是否包含中文字符
            const containsChinese = /[\u4e00-\u9fa5]/.test(word);
            // 如果是短语或句子，使用翻译接口
            if (word.includes(' ')) {
                const translationUrl = 'https://dict.youdao.com/jsonapi';
                const params = new URLSearchParams({
                    q: word,
                    dicts: JSON.stringify({
                        count: 99,
                        dicts: [['ec', 'ce']]
                    }),
                    client: 'web',
                    keyfrom: 'dict.top'
                });
                const response = await fetch(`${translationUrl}?${params.toString()}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                        'Accept': 'application/json',
                        'Referer': 'https://dict.youdao.com/'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data?.fanyi?.tran) {
                    return {
                        word,
                        translations: [data.fanyi.tran],
                        examples: [],
                        pluginName: 'Youdao'
                    };
                }
            }
            // 如果是单词，使用词典接口
            const url = containsChinese
                ? `https://dict.youdao.com/w/eng/${encodeURIComponent(word)}`
                : `https://dict.youdao.com/w/${encodeURIComponent(word)}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'max-age=0',
                    'Referer': 'https://dict.youdao.com/'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            const result = parse(html);
            return {
                ...result,
                word
            };
        }
        catch (error) {
            console.error('有道词典错误:', error);
            throw new Error(error instanceof Error ? error.message : '网络请求失败');
        }
    }
}

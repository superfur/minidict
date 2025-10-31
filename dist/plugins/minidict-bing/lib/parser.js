import * as cheerio from 'cheerio';
export function parse(html) {
    try {
        const $ = cheerio.load(html);
        // 获取音标 - 使用多个备选选择器
        const phonetic = {};
        // 尝试多个音标选择器
        const ukPhonetic = $('.hd_prUS, .hd_pr .hd_prUS, .pronounce .phonetic').first().text().trim() ||
            $('[class*="phonetic"][class*="uk"]').first().text().trim();
        const usPhonetic = $('.hd_pr, .hd_prUS ~ .hd_pr, .pronounce .phonetic').first().text().trim() ||
            $('[class*="phonetic"][class*="us"]').first().text().trim();
        if (ukPhonetic)
            phonetic.uk = ukPhonetic.replace(/[\[\]]/g, '');
        if (usPhonetic)
            phonetic.us = usPhonetic.replace(/[\[\]]/g, '');
        // 获取翻译 - 使用多个备选选择器
        const translations = [];
        // 主要释义 - 尝试多个选择器
        $('.qdef ul li, .qdef .def_area li, .def_area ul li, .content ul li').each((_, el) => {
            const text = $(el).text().trim();
            if (text && !translations.includes(text)) {
                translations.push(text);
            }
        });
        // 网络释义 - 尝试多个选择器
        $('.def_fl .df_div2, .def_fl .web_phrase, .web_phrase, .web-trans').each((_, el) => {
            const text = $(el).text().trim();
            if (text && !translations.includes(text)) {
                translations.push(`网络${text}`);
            }
        });
        // 如果还没有找到翻译，尝试更通用的选择器
        if (translations.length === 0) {
            $('.def_area, .translation, .meanings').find('li, span, div').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 1 && text.length < 100 && !text.includes('http')) {
                    translations.push(text);
                }
            });
        }
        // 获取例句 - 使用多个备选选择器
        const examples = [];
        // 尝试多个例句选择器
        $('.sen_en, .sen_en .sen_en, .example_en').each((index, el) => {
            const en = $(el).text().trim();
            const zh = $(el).next('.sen_cn, .sen_cn, .example_cn').text().trim() ||
                $(el).parent().find('.sen_cn, .example_cn').first().text().trim();
            if (en && zh && en.length > 5 && zh.length > 5) {
                examples.push({ en, zh });
            }
        });
        // 如果没有找到例句，尝试其他结构
        if (examples.length === 0) {
            $('.se_li, .sen_li, .example-item').each((_, el) => {
                const en = $(el).find('.sen_en, .en, .english').text().trim();
                const zh = $(el).find('.sen_cn, .zh, .chinese').text().trim();
                if (en && zh && en.length > 5 && zh.length > 5) {
                    examples.push({ en, zh });
                }
            });
        }
        // 过滤翻译结果
        const filteredTranslations = translations
            .map(t => t.replace(/^na\./, '').trim()) // 移除 "na." 前缀
            .filter(t => {
            if (t.length === 0)
                return false;
            if (t.includes('http'))
                return false;
            if (t.includes('@'))
                return false;
            if (t.match(/^\d+$/))
                return false;
            if (t.match(/^[a-zA-Z0-9]+$/) && t.length < 3)
                return false;
            return true;
        })
            .filter((value, index, self) => self.indexOf(value) === index); // 去重
        // 过滤例句
        const filteredExamples = examples
            .filter(({ en, zh }) => {
            if (!en || !zh)
                return false;
            if (en.includes('http') || zh.includes('http'))
                return false;
            if (en.includes('@') || zh.includes('@'))
                return false;
            if (en.length < 10 || zh.length < 10)
                return false;
            if (en.length > 200 || zh.length > 200)
                return false;
            return true;
        })
            .filter((value, index, self) => self.findIndex(e => e.en === value.en && e.zh === value.zh) === index); // 去重
        return {
            word: '', // 这个字段会在translator中被设置
            phonetic: Object.keys(phonetic).length > 0 ? phonetic : undefined,
            translations: filteredTranslations,
            examples: filteredExamples,
            pluginName: 'Bing'
        };
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : '解析失败');
    }
}

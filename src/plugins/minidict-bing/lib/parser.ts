import type { TranslationResult } from '../../../types.js';
import * as cheerio from 'cheerio';

/** 从形如「美 [heˈləʊ]」的文本中提取方括号内的音标；无方括号时回退为去标签的原文。 */
function extractPhonetic(raw: string): string {
  const match = raw.match(/\[([^\]]*)\]/);
  if (match) return match[1].trim();
  return raw.replace(/[[\]]/g, '').replace(/^(美|英|US|UK)\s*/i, '').trim();
}

export function parse(html: string): TranslationResult {
  try {
    const $ = cheerio.load(html);

    // 获取音标。Bing 当前 DOM：
    //   .hd_prUS  → 美式发音（文本形如「美 [heˈləʊ]」）
    //   .hd_pr    → 英式发音（文本形如「英 [həˈləʊ]」）
    // 仅取方括号内的音标符号，剥离「美/英/US/UK」等前缀标签。
    const phonetic: { uk?: string; us?: string } = {};

    const usPhonetic = $('.hd_prUS').first().text().trim() ||
                       $('[class*="phonetic"][class*="us"]').first().text().trim();
    const ukPhonetic = $('.hd_pr').first().text().trim() ||
                       $('[class*="phonetic"][class*="uk"]').first().text().trim();

    if (usPhonetic) phonetic.us = extractPhonetic(usPhonetic);
    if (ukPhonetic) phonetic.uk = extractPhonetic(ukPhonetic);

    // 获取翻译 - 使用多个备选选择器
    const translations: string[] = [];
    
    // 主要释义 - 尝试多个选择器
    $('.qdef ul li, .qdef .def_area li, .def_area ul li, .content ul li').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !translations.includes(text)) {
        translations.push(text);
      }
    });

    // 网络释义 - 尝试多个选择器。统一以「网络」前缀标记（剥离 Bing 自带的
    // 「Web」标签），与 Youdao 保持一致，由 formatter 合并展示。
    $('.def_fl .df_div2, .def_fl .web_phrase, .web_phrase, .web-trans').each((_, el) => {
      const text = $(el)
        .text()
        .trim()
        .replace(/^Web\s*/i, '');
      if (text && !translations.includes(`网络${text}`)) {
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
    const examples: { en: string; zh: string }[] = [];
    
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
      // Bing 把网络释义混在主释义列表里、以「Web」开头，统一改写为「网络」前缀，
      // 与 Youdao 一致，交由 formatter 合并展示。
      .map(t => t.replace(/^Web\s*/i, '网络'))
      .filter(t => {
        if (t.length === 0) return false;
        if (t.includes('http')) return false;
        if (t.includes('@')) return false;
        if (t.match(/^\d+$/)) return false;
        if (t.match(/^[a-zA-Z0-9]+$/) && t.length < 3) return false;
        return true;
      })
      .filter((value, index, self) => self.indexOf(value) === index); // 去重

    // 过滤例句
    const filteredExamples = examples
      .filter(({ en, zh }) => {
        if (!en || !zh) return false;
        if (en.includes('http') || zh.includes('http')) return false;
        if (en.includes('@') || zh.includes('@')) return false;
        if (en.length < 10 || zh.length < 10) return false;
        if (en.length > 200 || zh.length > 200) return false;
        return true;
      })
      .filter((value, index, self) => 
        self.findIndex(e => e.en === value.en && e.zh === value.zh) === index
      ); // 去重

    return {
      word: '',  // 这个字段会在translator中被设置
      phonetic: Object.keys(phonetic).length > 0 ? phonetic : undefined,
      translations: filteredTranslations,
      examples: filteredExamples,
      pluginName: 'Bing'
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '解析失败');
  }
} 
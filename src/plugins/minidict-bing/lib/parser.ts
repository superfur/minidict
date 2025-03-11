import type { TranslationResult } from '../../../types.js';
import * as cheerio from 'cheerio';

export function parse(html: string): TranslationResult {
  try {
    const $ = cheerio.load(html);
    
    // 获取音标
    const phonetic: { uk?: string; us?: string } = {};
    const ukPhonetic = $('.hd_prUS').first().text().trim();
    const usPhonetic = $('.hd_pr').first().text().trim();
    
    if (ukPhonetic) phonetic.uk = ukPhonetic;
    if (usPhonetic) phonetic.us = usPhonetic;

    // 获取翻译
    const translations: string[] = [];
    
    // 主要释义
    $('.qdef ul li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) translations.push(text);
    });

    // 网络释义
    $('.def_fl .df_div2').each((_, el) => {
      const text = $(el).text().trim();
      if (text) translations.push(`网络${text}`);
    });

    // 获取例句
    const examples: { en: string; zh: string }[] = [];
    
    $('.sen_en').each((index, el) => {
      const en = $(el).text().trim();
      const zh = $(el).next('.sen_cn').text().trim();
      
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    return {
      word: '',  // 这个字段会在translator中被设置
      phonetic: Object.keys(phonetic).length > 0 ? phonetic : undefined,
      translations: translations
        .map(t => t.replace(/^na\./, '').trim())  // 移除 "na." 前缀
        .filter(t => t.length > 0),
      examples: examples.slice(0, 3),  // 只保留前三个例句
      pluginName: 'Bing'
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '解析失败');
  }
} 
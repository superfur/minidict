import * as cheerio from 'cheerio';
import type { Example, TranslationResult } from '../../../types.js';

export function parse(html: string): Omit<TranslationResult, 'word'> {
  const $ = cheerio.load(html);
  
  // 获取音标
  const phonetic: { uk?: string; us?: string } = {};
  const ukPhonetic = $('.pronounce .phonetic').eq(0).text().trim();
  const usPhonetic = $('.pronounce .phonetic').eq(1).text().trim();
  if (ukPhonetic) phonetic.uk = ukPhonetic.replace(/[\[\]]/g, '');
  if (usPhonetic) phonetic.us = usPhonetic.replace(/[\[\]]/g, '');

  // 获取翻译
  const translations: string[] = [];
  
  // 从翻译区域获取
  $('#phrsListTab .trans-container li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text) translations.push(text);
  });

  // 从网络释义区域获取
  $('#tWebTrans .wt-container .title').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && !text.startsWith('更多')) {
      translations.push('网络' + text);
    }
  });

  // 如果没有找到翻译，尝试其他选择器
  if (translations.length === 0) {
    // 尝试从其他区域获取
    $('#results .trans-container p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#results .dict-result_left p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#webPhrase .wordGroup').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push('网络' + text);
    });

    // 尝试更多选择器
    $('#fanyiToggle .trans-container').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#webTrans .trans-container').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#eTransform .trans-container').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    // 尝试更多选择器
    $('#phrsListTab .wordGroup').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#phrsListTab .trans-container p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });

    $('#phrsListTab .trans-container span').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) translations.push(text);
    });
  }

  // 获取例句
  const examples: Example[] = [];
  
  // 从权威例句区域获取
  $('#authority .ol li').each((_, elem) => {
    const en = $(elem).find('.sen-en').text().trim();
    const zh = $(elem).find('.sen-ch').text().trim();
    if (en && zh) {
      examples.push({ en, zh });
    }
  });

  // 从双语例句区域获取
  $('#bilingual ul li').each((_, elem) => {
    const en = $(elem).find('.sen-en').text().trim();
    const zh = $(elem).find('.sen-ch').text().trim();
    if (en && zh) {
      examples.push({ en, zh });
    }
  });

  // 如果没有找到例句，尝试其他选择器
  if (examples.length === 0) {
    // 尝试从其他区域获取
    $('#examples li').each((_, elem) => {
      const en = $(elem).find('.example-sentence').text().trim();
      const zh = $(elem).find('.example-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    $('#bilingual li').each((_, elem) => {
      const en = $(elem).find('.sentence-eng').text().trim();
      const zh = $(elem).find('.sentence-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    // 尝试更多选择器
    $('#examplesToggle .examples-content').each((_, elem) => {
      const en = $(elem).find('.example-sentence').text().trim();
      const zh = $(elem).find('.example-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    $('#originalSound li').each((_, elem) => {
      const en = $(elem).find('.sentence-eng').text().trim();
      const zh = $(elem).find('.sentence-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    // 尝试更多选择器
    $('#authority li').each((_, elem) => {
      const en = $(elem).find('.sentence-eng').text().trim();
      const zh = $(elem).find('.sentence-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });

    $('#examples .examples-content').each((_, elem) => {
      const en = $(elem).find('.example-sentence').text().trim();
      const zh = $(elem).find('.example-translation').text().trim();
      if (en && zh) {
        examples.push({ en, zh });
      }
    });
  }

  // 过滤翻译结果
  const filteredTranslations = [...new Set(translations)]
    .filter(t => t && typeof t === 'string')
    .map(t => t.trim())
    .filter(t => {
      // 过滤掉不需要的内容
      if (t.length === 0) return false;
      if (t.startsWith('na.')) return false;
      if (t.includes('http')) return false;
      if (t.includes('@')) return false;
      if (t.match(/^\d+$/)) return false;
      if (t.match(/^[a-zA-Z0-9]+$/)) return false;
      return true;
    });

  // 过滤例句
  const filteredExamples = examples
    .filter(({ en, zh }) => {
      // 过滤掉不需要的例句
      if (!en || !zh) return false;
      if (en.includes('...') || zh.includes('...')) return false;
      if (en.includes('http') || zh.includes('http')) return false;
      if (en.includes('@') || zh.includes('@')) return false;
      if (en.match(/^\d+$/) || zh.match(/^\d+$/)) return false;
      if (en.length < 10 || zh.length < 10) return false;
      if (en.length > 200 || zh.length > 200) return false;
      return true;
    })
    .slice(0, 3); // 只保留前3个例句

  return {
    translations: filteredTranslations,
    phonetic,
    examples: filteredExamples,
    pluginName: 'Youdao'
  };
} 
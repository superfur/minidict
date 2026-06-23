import type { DictionaryPlugin, TranslationResult, ProxyConfig, Phonetic, Example } from '../../../types.js';
import { parse } from './parser.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

// 有道 jsonapi 的相关字段（仅声明用到的部分）：
//   ec.word[].usphone/ukphone  音标
//   ec.word[].trs[].tr[].l.i[] 释义（形如 "int. 喂，你好…"）
//   web_trans["web-translation"][].trans[].value  网络释义
//   blng_sents_part["sentence-pair"][]  双语例句
interface YoudaoJsonApi {
  ec?: {
    word?: Array<{
      usphone?: string;
      ukphone?: string;
      trs?: Array<{ tr?: Array<{ l?: { i?: unknown[] } }> }>;
    }>;
  };
  web_trans?: {
    'web-translation'?: Array<{ trans?: Array<{ value?: string }> }>;
  };
  blng_sents_part?: {
    'sentence-pair'?: Array<{ sentence?: string; 'sentence-translation'?: string }>;
  };
}

/** 把 jsonapi 响应解析为统一的 TranslationResult（用于短语/句子查询）。 */
function parseJsonApi(data: YoudaoJsonApi, word: string): TranslationResult {
  const ec = data.ec?.word?.[0];

  const phonetic: Phonetic = {};
  if (ec?.ukphone) phonetic.uk = ec.ukphone;
  if (ec?.usphone) phonetic.us = ec.usphone;

  const translations: string[] = [];
  for (const trs of ec?.trs ?? []) {
    for (const tr of trs.tr ?? []) {
      for (const item of tr.l?.i ?? []) {
        if (typeof item === 'string' && item.trim()) translations.push(item.trim());
      }
    }
  }

  // 网络释义（取前若干条，formatter 会合并去重为一行）。
  const webTrans = data.web_trans?.['web-translation'] ?? [];
  for (const wt of webTrans.slice(0, 4)) {
    for (const t of wt.trans ?? []) {
      if (t.value) translations.push(`网络${t.value}`);
    }
  }

  const examples: Example[] = [];
  for (const sp of data.blng_sents_part?.['sentence-pair'] ?? []) {
    const en = (sp.sentence || '').trim();
    const zh = (sp['sentence-translation'] || '').trim();
    if (en && zh) examples.push({ en, zh });
  }

  return {
    word,
    phonetic: phonetic.uk || phonetic.us ? phonetic : undefined,
    translations,
    examples,
    pluginName: 'Youdao'
  };
}

export class YoudaoTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;
  private timeoutMs: number = 10000;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  setTimeout(timeoutMs: number): void {
    this.timeoutMs = timeoutMs;
  }

  async translate(word: string): Promise<TranslationResult> {
    try {
      const containsChinese = /[一-龥]/.test(word);

      // 多词（短语/句子）：走 jsonapi，解析词典释义/网络释义/例句。
      // 有道免费接口对「整句」不提供机器翻译，因此整句通常无释义——
      // 此时给出明确提示，引导改用 Bing / Google，而非回退抓取词典页（会返回无关内容）。
      if (word.includes(' ')) {
        const apiUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`;
        const response = await fetchWithProxy(
          apiUrl,
          { headers: { Referer: 'https://dict.youdao.com/' } },
          this.proxy,
          this.timeoutMs
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('json')) {
          throw new Error(`API 返回非 JSON 响应: ${contentType}`);
        }

        let data: YoudaoJsonApi;
        try {
          data = (await response.json()) as YoudaoJsonApi;
        } catch {
          throw new Error('解析 API 响应失败');
        }

        const result = parseJsonApi(data, word);
        if (result.translations.length === 0) {
          throw new Error('该来源暂不支持整句翻译，请使用 Bing 或 Google');
        }
        return result;
      }

      const url = containsChinese
        ? `https://dict.youdao.com/w/eng/${encodeURIComponent(word)}`
        : `https://dict.youdao.com/w/${encodeURIComponent(word)}`;

      const response = await fetchWithProxy(
        url,
        {
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            Connection: 'keep-alive',
            'Cache-Control': 'max-age=0',
            Referer: 'https://dict.youdao.com/'
          }
        },
        this.proxy,
        this.timeoutMs
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const result = parse(html);
      return {
        ...result,
        word
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '网络请求失败');
    }
  }
}

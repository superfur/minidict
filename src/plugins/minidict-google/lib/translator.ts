import type { TranslationResult, ProxyConfig } from '../../../types.js';
import { fetchWithProxy } from '../../../utils/fetch.js';

// translate_a/single 的返回是嵌套数组：
//   [ [ ["译文片段","原文片段", ...], ... ], ..., "检测到的源语言", ... ]
// 第 0 项是译文片段数组，拼接每段的第 0 个元素即得完整译文。
type GoogleSegment = [string, string, ...unknown[]];
type GoogleResponse = [GoogleSegment[] | null, ...unknown[]];

function isChineseText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      return true;
    }
  }
  return false;
}

export async function translate(word: string, proxy?: ProxyConfig, timeoutMs: number = 10000): Promise<TranslationResult> {
  try {
    // 目标语言：中文输入译为英文，否则译为中文；源语言交由 Google 自动检测（sl=auto）。
    const targetLang = isChineseText(word) ? 'en' : 'zh-CN';

    // 使用 Google 翻译网页版的免 key 接口（client=gtx），而非需要付费密钥的官方 v2 接口。
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: targetLang,
      dt: 't',
      q: word
    });

    const response = await fetchWithProxy(`${url}?${params.toString()}`, {}, proxy, timeoutMs);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data: GoogleResponse;
    try {
      data = await response.json() as GoogleResponse;
    } catch {
      throw new Error('解析 API 响应失败');
    }

    const segments = Array.isArray(data) ? data[0] : null;
    const translatedText = Array.isArray(segments)
      ? segments.map(seg => (Array.isArray(seg) ? seg[0] : '')).join('').trim()
      : '';

    if (translatedText) {
      return {
        word,
        translations: [translatedText],
        examples: [],
        pluginName: 'Google'
      };
    }

    throw new Error('翻译失败：未获取到有效的翻译结果');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Google 翻译失败');
  }
}

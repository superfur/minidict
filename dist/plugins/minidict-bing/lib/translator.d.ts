import type { TranslationResult, ProxyConfig } from '../../../types.js';
export declare function translate(word: string, proxy?: ProxyConfig, timeoutMs?: number): Promise<TranslationResult>;

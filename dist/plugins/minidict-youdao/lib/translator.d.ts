import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../../types.js';
export declare class YoudaoTranslator implements DictionaryPlugin {
    private proxy?;
    private timeoutMs;
    setProxy(proxy?: ProxyConfig): void;
    setTimeout(timeoutMs: number): void;
    translate(word: string): Promise<TranslationResult>;
}

import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../../types.js';
export declare class YoudaoTranslator implements DictionaryPlugin {
    private proxy?;
    setProxy(proxy?: ProxyConfig): void;
    private fetchWithProxy;
    translate(word: string): Promise<TranslationResult>;
}

import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
declare class BingTranslator implements DictionaryPlugin {
    private proxy?;
    setProxy(proxy?: ProxyConfig): void;
    translate(word: string): Promise<TranslationResult>;
}
declare const translator: BingTranslator;
export default translator;
export { BingTranslator };

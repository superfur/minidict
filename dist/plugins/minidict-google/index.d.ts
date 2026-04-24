import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
declare class GoogleTranslator implements DictionaryPlugin {
    private proxy?;
    private timeoutMs;
    setProxy(proxy?: ProxyConfig): void;
    setTimeout(timeoutMs: number): void;
    translate(text: string): Promise<TranslationResult>;
}
declare const translator: GoogleTranslator;
export default translator;
export { GoogleTranslator };

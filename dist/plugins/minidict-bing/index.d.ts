import type { DictionaryPlugin, TranslationResult } from '../../types.js';
declare class BingTranslator implements DictionaryPlugin {
    translate(word: string): Promise<TranslationResult>;
}
declare const translator: BingTranslator;
export default translator;

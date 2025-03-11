import type { DictionaryPlugin, TranslationResult } from '../../../types.js';
export declare class YoudaoTranslator implements DictionaryPlugin {
    translate(word: string): Promise<TranslationResult>;
}

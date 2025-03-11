import type { DictionaryPlugin, TranslationResult } from '../types';
export declare class YoudaoTranslator implements DictionaryPlugin {
    name: string;
    translate(word: string): Promise<TranslationResult>;
}

import type { DictionaryPlugin, TranslationResult } from '../types';
export declare class BingTranslator implements DictionaryPlugin {
    name: string;
    translate(word: string): Promise<TranslationResult>;
}

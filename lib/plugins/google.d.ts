import type { DictionaryPlugin, TranslationResult } from '../types';
export declare class GoogleTranslator implements DictionaryPlugin {
    name: string;
    translate(word: string): Promise<TranslationResult>;
}

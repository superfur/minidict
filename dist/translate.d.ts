import type { TranslationResult, Config } from './types.js';
export declare function translate(word: string, config: Config, onResult?: (result: TranslationResult) => void): Promise<TranslationResult[]>;

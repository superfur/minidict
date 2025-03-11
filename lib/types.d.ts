export interface Config {
    plugins: string[];
    showPhonetic: boolean;
    showExamples: boolean;
    maxExamples: number;
}
export interface Example {
    en: string;
    zh: string;
}
export interface TranslationResult {
    word: string;
    translations: string[];
    phonetic?: string;
    examples?: Example[];
    source: string;
}
export interface DictionaryPlugin {
    name: string;
    translate(word: string): Promise<TranslationResult>;
}

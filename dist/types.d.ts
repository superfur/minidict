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
export interface Phonetic {
    uk?: string;
    us?: string;
}
export interface TranslationResult {
    word: string;
    phonetic?: string | Phonetic;
    translations: string[];
    examples?: Example[];
    pluginName: string;
}
export interface DictionaryPlugin {
    translate(word: string): Promise<TranslationResult>;
}
export interface MDOutput {
    word: string;
    phonetic?: string | Phonetic;
    translations: string[];
    examples?: Example[];
    pluginName?: string;
    url?: string;
}
export interface MDError {
    message: string;
    code: string;
}

import type { load } from 'cheerio';
export interface Phonetic {
    type: string;
    value: string;
}
export interface Translation {
    type: string;
    trans: string;
}
export interface Example {
    source: string;
    target: string;
}
export interface MDError {
    code: number;
    message: string;
}
export interface MDOutput {
    pluginName: string;
    words: string;
    url: string;
    phonetics?: Array<{
        type: string;
        value: string;
    }>;
    translations?: Array<{
        type: string;
        trans: string;
    }>;
    examples?: string[];
}
export interface Parser {
    $: ReturnType<typeof load>;
    parse(): MDOutput | MDError;
}
export interface CheerioElement {
    text(): string;
    html(): string | null;
    find(selector: string): CheerioElement;
    first(): CheerioElement;
    each(callback: (index: number, element: CheerioElement) => void): void;
    length: number;
}
export interface TranslationResult {
    word: string;
    phonetic?: string;
    translations: string[];
    examples?: string[];
    source: string;
}
export interface DictionaryPlugin {
    name: string;
    translate(word: string): Promise<TranslationResult>;
}
export interface Config {
    plugins: string[];
    showPhonetic: boolean;
    showExamples: boolean;
    maxExamples: number;
}

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
    en: string;
    zh: string;
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

// 音标类型：支持字符串或对象格式
export type PhoneticValue = string | { uk?: string; us?: string };

export interface TranslationResult {
  word: string;
  phonetic?: PhoneticValue;
  translations: string[];
  examples?: Example[];
  pluginName: string;
}

export interface DictionaryPlugin {
  name?: string;
  translate(word: string): Promise<TranslationResult>;
}

export interface Config {
  plugins: string[];
  showPhonetic: boolean;
  showExamples: boolean;
  maxExamples: number;
} 
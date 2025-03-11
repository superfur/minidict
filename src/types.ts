export interface Config {
  plugins: Array<'bing' | 'youdao'>;
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
  source?: string;
  pluginName?: string;
}

export interface DictionaryPlugin {
  translate(word: string): Promise<TranslationResult>;
}

// 为 Bing 和 Youdao 插件添加类型
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
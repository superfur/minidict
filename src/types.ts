export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface Config {
  plugins: string[];
  showPhonetic: boolean;
  showExamples: boolean;
  maxExamples: number;
  timeout?: number;
  proxy?: ProxyConfig;
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
  error?: string;
}

export interface DictionaryPlugin {
  translate(word: string): Promise<TranslationResult>;
  setProxy?(proxy?: ProxyConfig): void;
  setTimeout?(timeoutMs: number): void;
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
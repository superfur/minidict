export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface CacheConfig {
  /** 是否启用查询结果缓存（默认启用） */
  enabled: boolean;
  /** 缓存有效期，单位毫秒（默认 7 天） */
  ttl: number;
}

export interface AutoUpdateConfig {
  /** 是否在查询后静默检查新版本（默认启用） */
  enabled: boolean;
  /** 两次检查之间的最小间隔，单位毫秒（默认 24 小时） */
  checkInterval: number;
}

export interface Config {
  plugins: string[];
  showPhonetic: boolean;
  showExamples: boolean;
  maxExamples: number;
  timeout?: number;
  proxy?: ProxyConfig;
  /** 缓存配置 */
  cache?: CacheConfig;
  /** 自动更新检查配置 */
  autoUpdate?: AutoUpdateConfig;
  /** 额外的外部插件模块说明符（npm 包名或绝对路径），按需动态加载 */
  externalPlugins?: string[];
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

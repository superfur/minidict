import type { ErrorCode } from './errors.js';

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks' | 'socks4' | 'socks4a' | 'socks5' | 'socks5h';
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

/** 解析完成、所有字段都有值的配置。 */
export interface Config {
  /** 启用的词典插件名（内置：bing / youdao / google），按此顺序返回结果 */
  plugins: string[];
  showPhonetic: boolean;
  showExamples: boolean;
  /** 每个来源最多保留的例句数；0 表示不限制 */
  maxExamples: number;
  /** 单次请求超时，毫秒 */
  timeout: number;
  /** 源语言代码，'auto' 表示自动检测 */
  from: string;
  /** 目标语言代码，'auto' 表示按输入自动选择（中文 → en，其它 → zh） */
  to: string;
  proxy?: ProxyConfig;
  cache: CacheConfig;
  autoUpdate: AutoUpdateConfig;
  /** 额外的外部插件模块说明符（npm 包名或文件路径），按需动态加载 */
  externalPlugins: string[];
}

/** 用户可提供的配置：所有字段可选，proxy 既可写对象也可写 URL 字符串。 */
export interface UserConfig extends Partial<Omit<Config, 'proxy' | 'cache' | 'autoUpdate'>> {
  proxy?: ProxyConfig | string;
  cache?: Partial<CacheConfig>;
  autoUpdate?: Partial<AutoUpdateConfig>;
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
  /**
   * 释义行。约定：
   *   - 以词性缩写开头（如 "n. 苹果"）的行按词性对齐展示；
   *   - 以「网络」开头的行视为网络释义，合并展示；
   *   - 其它为普通文本（如整句译文）。
   */
  translations: string[];
  examples?: Example[];
  /** 来源展示名（如 Bing） */
  pluginName: string;
  /** 失败时的错误信息；存在即表示该来源失败 */
  error?: string;
  /** 失败时的结构化错误码 */
  errorCode?: ErrorCode;
  /** 实际使用的源 / 目标语言 */
  from?: string;
  to?: string;
  /** 是否来自本地缓存 */
  cached?: boolean;
  /** 该来源耗时，毫秒 */
  elapsedMs?: number;
}

/** 每次查询传给插件的上下文。插件应是无状态的：所有运行参数都从这里取。 */
export interface TranslateContext {
  /** 源语言代码，'auto' 表示未指定 */
  from: string;
  /** 目标语言代码（已解析，不会是 'auto'） */
  to: string;
  /** 单次请求超时，毫秒 */
  timeout: number;
  proxy?: ProxyConfig;
}

export interface DictionaryPlugin {
  /** 来源展示名；缺省时由插件注册名首字母大写得到 */
  displayName?: string;
  translate(text: string, context: TranslateContext): Promise<TranslationResult>;
  /** @deprecated 2.x 遗留接口，3.x 起请改从 context 读取；仍会被调用以保持兼容。 */
  setProxy?(proxy?: ProxyConfig): void;
  /** @deprecated 2.x 遗留接口，3.x 起请改从 context 读取；仍会被调用以保持兼容。 */
  setTimeout?(timeoutMs: number): void;
}

export type { ErrorCode };

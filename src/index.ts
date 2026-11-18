// ESM 要求相对导入带 .js 扩展名，否则编译产物在运行时无法解析（导致 import 'minidict' 失败）
export * from './types.js';
export { translate, availablePlugins, applyMaxExamples, NO_RESULT_MESSAGE } from './translate.js';
export {
  defaultConfig,
  resolveConfig,
  loadConfig,
  defaultConfigPath,
  parseProxyUrl,
  getProxyFromEnv
} from './config.js';
export { MinidictError, ERROR_LABELS } from './errors.js';
export { detectLanguage, normalizeLang, resolveLanguages } from './lang.js';
export type { LanguagePair } from './lang.js';
export { clearCache, pruneCache } from './utils/cache.js';
export { fetchJson, fetchText } from './utils/fetch.js';
export type { RequestContext } from './utils/fetch.js';
export {
  formatHeader,
  formatResult,
  formatErrorResult,
  formatSummary,
  formatPhonetic
} from './render/card.js';
export { formatPlainResult, formatJson } from './render/plain.js';
export type { JsonOutput } from './render/plain.js';
export * from './version.js';

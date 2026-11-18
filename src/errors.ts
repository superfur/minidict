/**
 * 结构化错误：用稳定的 code 表达失败原因，展示层据此分类，
 * 不再依赖对中文错误信息做字符串匹配。
 */
export type ErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP'
  | 'RATE_LIMIT'
  | 'NO_RESULT'
  | 'PARSE'
  | 'UNSUPPORTED'
  | 'UNKNOWN_PLUGIN'
  | 'PLUGIN_LOAD'
  | 'UNKNOWN';

/** 各错误码对应的简短中文标签（卡片标题旁展示）。 */
export const ERROR_LABELS: Record<ErrorCode, string> = {
  TIMEOUT: '连接超时',
  NETWORK: '网络错误',
  HTTP: '网络错误',
  RATE_LIMIT: '请求过于频繁',
  NO_RESULT: '无结果',
  PARSE: '解析失败',
  UNSUPPORTED: '不支持',
  UNKNOWN_PLUGIN: '未知插件',
  PLUGIN_LOAD: '插件加载失败',
  UNKNOWN: '请求失败'
};

export class MinidictError extends Error {
  readonly code: ErrorCode;
  /** HTTP 状态码（仅 HTTP / RATE_LIMIT 错误携带）。 */
  readonly status?: number;

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'MinidictError';
    this.code = code;
    this.status = status;
  }
}

/** 从任意抛出值中取错误码；非 MinidictError 一律归为 UNKNOWN。 */
export function errorCodeOf(error: unknown): ErrorCode {
  return error instanceof MinidictError ? error.code : 'UNKNOWN';
}

export function errorMessageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return typeof error === 'string' && error ? error : '未知错误';
}

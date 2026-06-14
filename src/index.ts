// ESM 要求相对导入带 .js 扩展名，否则编译产物在运行时无法解析（导致 import 'minidict' 失败）
export * from './types.js';
export * from './translate.js';
export * from './version.js';

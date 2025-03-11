import { MDOutput } from '../types';
/**
 * 搜索翻译结果
 * @param words 要翻译的文本
 * @param types 启用的翻译插件类型
 */
export declare function search(words: string, types: Record<string, boolean>): Promise<MDOutput[]>;

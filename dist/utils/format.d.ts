import chalk from 'chalk';
import type { TranslationResult, Phonetic, Example } from '../types.js';
export declare const ICONS: {
    BOOK: string;
    SPEAKER: string;
    NOTE: string;
    WEB: string;
    ARROW: string;
    STAR: string;
    DIVIDER: string;
};
export declare const COLORS: {
    title: chalk.Chalk;
    word: chalk.Chalk;
    phonetic: chalk.Chalk;
    translation: chalk.Chalk;
    translationNet: chalk.Chalk;
    exampleIndex: chalk.Chalk;
    exampleEn: chalk.Chalk;
    exampleZh: chalk.Chalk;
    pluginTag: chalk.Chalk;
    error: chalk.Chalk;
    success: chalk.Chalk;
    bold: chalk.Chalk;
    gray: chalk.Chalk;
    yellow: chalk.Chalk;
};
/**
 * 格式化音标
 */
export declare function formatPhonetic(phonetic?: string | Phonetic): string;
/**
 * 格式化翻译结果
 */
export declare function formatTranslations(translations: string[]): string;
/**
 * 格式化例句
 */
export declare function formatExamples(examples: Example[], maxExamples?: number): string;
/**
 * 格式化单个结果（美化版）
 */
export declare function formatResult(result: TranslationResult, showPhonetic: boolean, showExamples: boolean, maxExamples: number): string;
/**
 * 格式化简洁版本（适合快速查询）
 */
export declare function formatResultCompact(result: TranslationResult, showPhonetic: boolean, showExamples: boolean, maxExamples: number): string;
/**
 * 格式化错误信息
 */
export declare function formatError(message: string, pluginName?: string): string;
/**
 * 格式化加载状态
 */
export declare function formatLoading(text: string): string;
/**
 * 格式化汇总信息
 */
export declare function formatSummary(results: TranslationResult[], elapsed?: string): string;

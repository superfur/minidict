import chalk from 'chalk';
// 常用图标
export const ICONS = {
    BOOK: chalk.blue('📖'),
    SPEAKER: chalk.cyan('🔊'),
    NOTE: chalk.yellow('📝'),
    WEB: chalk.green('🌐'),
    ARROW: chalk.gray('→'),
    STAR: chalk.yellow('★'),
    DIVIDER: chalk.gray('─'.repeat(40))
};
// 颜色配置
export const COLORS = {
    title: chalk.bold.cyan,
    word: chalk.bold.white,
    phonetic: chalk.gray,
    translation: chalk.green,
    translationNet: chalk.gray,
    exampleIndex: chalk.cyan.bold,
    exampleEn: chalk.blue,
    exampleZh: chalk.gray,
    pluginTag: chalk.bgBlack.bold.white,
    error: chalk.red,
    success: chalk.green,
    bold: chalk.bold,
    gray: chalk.gray,
    yellow: chalk.yellow
};
/**
 * 格式化音标
 */
export function formatPhonetic(phonetic) {
    if (!phonetic)
        return '';
    if (typeof phonetic === 'string') {
        return COLORS.phonetic(`[${phonetic}]`);
    }
    const parts = [];
    if (phonetic.uk) {
        parts.push(`英 [${phonetic.uk}]`);
    }
    if (phonetic.us) {
        parts.push(`美 [${phonetic.us}]`);
    }
    return parts.length > 0 ? COLORS.phonetic(parts.join('  ')) : '';
}
/**
 * 格式化翻译结果
 */
export function formatTranslations(translations) {
    if (translations.length === 0)
        return '';
    return translations.map(t => {
        if (t.startsWith('网络')) {
            return '  ·   ' + COLORS.gray(t.replace('网络', ''));
        }
        const match = t.match(/^([a-z]+\.)\s*(.+)$/i);
        if (match) {
            const [_, pos, text] = match;
            return '  ' + COLORS.yellow(pos.padEnd(5)) + text;
        }
        return '  ' + COLORS.translation(t);
    }).join('\n');
}
/**
 * 格式化例句
 */
export function formatExamples(examples, maxExamples = 3) {
    if (!examples || examples.length === 0)
        return '';
    const limited = examples.slice(0, maxExamples);
    return limited.map((ex, i) => {
        return [
            `  ${COLORS.exampleIndex(`${i + 1}.`)}  ${COLORS.exampleEn(ex.en)}`,
            `      ${COLORS.exampleZh(ex.zh)}`
        ].join('\n');
    }).join('\n\n');
}
/**
 * 格式化单个结果（美化版）
 */
export function formatResult(result, showPhonetic, showExamples, maxExamples) {
    const lines = [];
    // 插件标题行
    lines.push(`  ${COLORS.bold.gray(result.pluginName)}  ` + COLORS.gray('─'.repeat(36 - result.pluginName.length)));
    // 翻译
    if (result.translations.length > 0) {
        lines.push(formatTranslations(result.translations));
    }
    // 例句
    if (showExamples && result.examples && result.examples.length > 0) {
        lines.push('');
        lines.push(`  ${COLORS.title('例句')}`);
        lines.push(formatExamples(result.examples, maxExamples));
    }
    lines.push('');
    return lines.join('\n');
}
/**
 * 格式化简洁版本（适合快速查询）
 */
export function formatResultCompact(result, showPhonetic, showExamples, maxExamples) {
    const lines = [];
    // 插件标识
    lines.push(COLORS.pluginTag(`[${result.pluginName}]`));
    // 单词
    lines.push(COLORS.word(result.word));
    // 音标
    if (showPhonetic && result.phonetic) {
        lines.push(formatPhonetic(result.phonetic));
    }
    // 翻译
    if (result.translations.length > 0) {
        lines.push(result.translations
            .slice(0, 5)
            .map(t => t.startsWith('网络') ? COLORS.translationNet(`  ${t}`) : COLORS.translation(`  ${t}`))
            .join('\n'));
    }
    // 例句
    if (showExamples && result.examples && result.examples.length > 0) {
        lines.push('');
        lines.push(COLORS.title('例句:'));
        result.examples.slice(0, maxExamples).forEach((ex, i) => {
            lines.push(COLORS.exampleIndex(`  ${i + 1}.`) + ' ' + COLORS.exampleEn(ex.en));
            lines.push(`    ${COLORS.exampleZh(ex.zh)}`);
        });
    }
    lines.push('');
    return lines.join('\n');
}
/**
 * 格式化错误信息
 */
export function formatError(message, pluginName) {
    const prefix = pluginName ? `[${pluginName}] ` : '';
    return COLORS.error(`${prefix}错误: ${message}`);
}
/**
 * 格式化加载状态
 */
export function formatLoading(text) {
    return chalk.cyan(`  ${ICONS.SPEAKER} ${text}...`);
}
/**
 * 格式化汇总信息
 */
export function formatSummary(results, elapsed) {
    const lines = [];
    if (results.length === 0) {
        return COLORS.error('未找到任何翻译结果');
    }
    const statusParts = [];
    for (const result of results) {
        if (result.error) {
            statusParts.push(`${chalk.red(result.pluginName + ' ✗')}`);
        }
        else {
            statusParts.push(`${chalk.green(result.pluginName + ' ✓')}`);
        }
    }
    lines.push('');
    lines.push(chalk.gray('  ' + '━'.repeat(41)));
    let summary = '  完成';
    if (elapsed) {
        summary += ` ${elapsed}s`;
    }
    summary += ' · ';
    summary += statusParts.join('  ');
    lines.push(summary);
    lines.push('');
    return lines.join('\n');
}

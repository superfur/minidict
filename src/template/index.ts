import * as stringBreak from 'string-break';
import * as pad from 'pad';
import { highlight } from './highlight';
import { MDOutput } from '../types';

function formatLine(str: string, words: string, firstLineIndent = ''): string {
    const breakOptions = {
        width: 80,
        firstLineIndent,
        indent: ' '.repeat(firstLineIndent.length)
    };

    return (stringBreak as any)(str, breakOptions)
        .split('\n')
        .map((line: string, index: number) => {
            return index === 0 ? line : (pad as any)(line, line.length + firstLineIndent.length);
        })
        .map((line: string) => highlight(line, words))
        .join('\n');
}

export function template(data: MDOutput[]): string {
    if (!data || !data.length) {
        return '未找到翻译结果';
    }

    return data.map(item => {
        const lines: string[] = [];
        const words = item.words;

        // 添加标题
        lines.push(`\n# ${item.pluginName}`);
        lines.push(`${item.url}\n`);

        // 添加音标
        if (item.phonetics && item.phonetics.length) {
            const phoneticStr = item.phonetics
                .map(p => `${p.type}. [${p.value}]`)
                .join('  ');
            lines.push(formatLine(phoneticStr, words));
        }

        // 添加翻译
        if (item.translations && item.translations.length) {
            lines.push('');
            item.translations.forEach(t => {
                const transStr = t.type ? `${t.type}. ${t.trans}` : t.trans;
                lines.push(formatLine(transStr, words, '  '));
            });
        }

        // 添加例句
        if (item.examples && item.examples.length) {
            lines.push('\n例句:');
            item.examples.forEach(example => {
                lines.push(formatLine(example, words, '  '));
            });
        }

        return lines.join('\n');
    }).join('\n');
}

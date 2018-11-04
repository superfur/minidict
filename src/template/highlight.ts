import * as chalk from 'chalk';

export function highlight(str: string, words: string): string {
    if (!words) return str;
    const regexp = new RegExp(words, 'ig');
    return str.replace(regexp, (substr: string) => chalk.yellow(substr));
} 
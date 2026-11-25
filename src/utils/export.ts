import fs from 'fs/promises';
import path from 'path';
import { readCacheEntries } from './cache.js';
import type { TranslationResult, Phonetic } from '../types.js';

export type ExportFormat = 'csv' | 'md';

interface ExportOptions {
  filePath: string;
  format: ExportFormat;
  ttlMs: number;
  includeExpired?: boolean;
}

interface VocabularyEntry {
  word: string;
  from?: string;
  to?: string;
  results: TranslationResult[];
}

function entryTitle(entry: VocabularyEntry): string {
  if (!entry.from && !entry.to) return entry.word;
  return `${entry.word} [${entry.from ?? 'auto'} → ${entry.to ?? 'auto'}]`;
}

function phoneticText(phonetic: string | Phonetic | undefined): string {
  if (!phonetic) return '';
  if (typeof phonetic === 'string') return phonetic;
  return [phonetic.uk ? `英 ${phonetic.uk}` : '', phonetic.us ? `美 ${phonetic.us}` : '']
    .filter(Boolean)
    .join(' / ');
}

function html(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r\n|\r|\n/g, '<br>');
}

function csvField(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

/** 两列分别对应 Anki 的正面和背面；用 Anki 文件头声明分隔符、HTML 和字段名。 */
function toCsv(entries: VocabularyEntry[]): string {
  const rows = entries.map(entry => {
    const back = entry.results
      .map(result => {
        const phonetic = phoneticText(result.phonetic);
        return [
          `<b>${html(result.pluginName)}</b>`,
          ...(phonetic ? [html(phonetic)] : []),
          ...result.translations.map(html),
          ...(result.examples ?? []).map(example => `${html(example.en)}<br>${html(example.zh)}`)
        ].join('<br>');
      })
      .join('<br><br>');
    return `${csvField(html(entryTitle(entry)))},${csvField(back)}`;
  });
  return ['#separator:Comma', '#html:true', '#columns:Front,Back', ...rows, ''].join('\n');
}

function markdown(text: string): string {
  return text.replace(/([\\`*_[\]<>#|])/g, '\\$1').replace(/\r\n|\r|\n/g, '<br>');
}

function toMarkdown(entries: VocabularyEntry[]): string {
  const sections = entries.map(entry => {
    const sources = entry.results.map(result => {
      const phonetic = phoneticText(result.phonetic);
      const examples = result.examples ?? [];
      return [
        `### ${markdown(result.pluginName)}`,
        ...(phonetic ? [`音标：${markdown(phonetic)}`] : []),
        result.translations.map(translation => `- ${markdown(translation)}`).join('\n'),
        ...(examples.length > 0
          ? [
              '例句：',
              examples
                .map(example => `- ${markdown(example.en)}\n  ${markdown(example.zh)}`)
                .join('\n')
            ]
          : [])
      ]
        .filter(Boolean)
        .join('\n\n');
    });
    return [`## ${markdown(entryTitle(entry))}`, ...sources].join('\n\n');
  });
  return ['# 复习词表', ...sections, ''].join('\n\n');
}

/** 离线导出缓存，同一查询的不同词典结果合并；已有目标文件不会被覆盖。 */
export async function exportCache(options: ExportOptions): Promise<{
  filePath: string;
  wordCount: number;
}> {
  const cached = await readCacheEntries(options.ttlMs, options.includeExpired);
  const byWord = new Map<string, VocabularyEntry>();
  for (const { result } of cached) {
    const key = JSON.stringify([result.word, result.from ?? '', result.to ?? '']);
    let entry = byWord.get(key);
    if (!entry) {
      entry = { word: result.word, from: result.from, to: result.to, results: [] };
      byWord.set(key, entry);
    }
    entry.results.push(result);
  }
  const entries = [...byWord.values()].sort((a, b) => a.word.localeCompare(b.word, 'en'));
  for (const entry of entries) {
    entry.results.sort((a, b) => a.pluginName.localeCompare(b.pluginName, 'en'));
  }

  const filePath = path.resolve(options.filePath);
  const content = options.format === 'csv' ? toCsv(entries) : toMarkdown(entries);
  try {
    await fs.writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`目标文件已存在，请使用新的文件名：${filePath}`);
    }
    throw error;
  }
  return { filePath, wordCount: entries.length };
}

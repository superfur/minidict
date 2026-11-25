import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { TranslationResult } from '../types.js';

export interface CacheEntry {
  timestamp: number;
  result: TranslationResult;
}

export interface CacheKey {
  plugin: string;
  text: string;
  from?: string;
  to?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PRUNE_MARKER = '.last-prune';

/** 缓存目录：可用 MINIDICT_CACHE_DIR 覆盖（便于测试与自定义存放位置）。 */
export function cacheDir(): string {
  return process.env.MINIDICT_CACHE_DIR || path.join(os.homedir(), '.minidict', 'cache');
}

/** 归一查询文本：去首尾空白并折叠内部空白，使 "a  b" 与 "a b" 命中同一条缓存。 */
export function normalizeQuery(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** 把缓存键映射为稳定、文件系统安全的缓存文件名。 */
function cacheFile(key: CacheKey): string {
  // v3：键中加入语言方向；同时让旧版本写入的条目自然失效。
  const raw = ['v3', key.plugin, key.from ?? 'auto', key.to ?? 'auto', normalizeQuery(key.text)];
  const hash = crypto.createHash('sha1').update(raw.join('::')).digest('hex');
  return path.join(cacheDir(), `${hash}.json`);
}

/**
 * 读取缓存。命中且未过期返回结果，否则返回 undefined。
 * 任何 I/O / 解析错误都视为未命中（缓存永不阻断正常查询）。
 */
export async function getCached(
  key: CacheKey,
  ttlMs: number
): Promise<TranslationResult | undefined> {
  try {
    const content = await fs.readFile(cacheFile(key), 'utf-8');
    const entry: CacheEntry = JSON.parse(content);
    if (!entry || typeof entry.timestamp !== 'number') return undefined;
    // 用 >= 使 ttl=0 始终视为过期（等价于禁用缓存），不依赖毫秒级耗时。
    if (Date.now() - entry.timestamp >= ttlMs) return undefined;
    if (!Array.isArray(entry.result?.translations) || entry.result.translations.length === 0) {
      return undefined;
    }
    return entry.result;
  } catch {
    return undefined;
  }
}

/**
 * 写入缓存。只缓存有释义的成功结果。先写临时文件再原子改名，
 * 避免并发查询或中途退出留下半截文件。写入失败静默忽略。
 */
export async function setCached(key: CacheKey, result: TranslationResult): Promise<void> {
  if (result.error || !result.translations?.length) return;
  try {
    await fs.mkdir(cacheDir(), { recursive: true });
    const entry: CacheEntry = { timestamp: Date.now(), result };
    const file = cacheFile(key);
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entry), 'utf-8');
    await fs.rename(tmp, file);
  } catch {
    // 忽略缓存写入错误
  }
}

/**
 * 删除超过 ttl 的缓存文件，返回删除数量。
 * 默认每 24 小时最多执行一次（用标记文件节流）；force 时立即执行。
 */
export async function pruneCache(ttlMs: number, force: boolean = false): Promise<number> {
  const dir = cacheDir();
  const marker = path.join(dir, PRUNE_MARKER);
  try {
    if (!force) {
      const stat = await fs.stat(marker).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs < DAY_MS) return 0;
    }

    const names = await fs.readdir(dir);
    const now = Date.now();
    let removed = 0;
    await Promise.all(
      names
        .filter(name => name.endsWith('.json') || name.endsWith('.tmp'))
        .map(async name => {
          const file = path.join(dir, name);
          try {
            const stat = await fs.stat(file);
            if (now - stat.mtimeMs >= ttlMs) {
              await fs.rm(file, { force: true });
              removed++;
            }
          } catch {
            // 文件可能已被并发删除
          }
        })
    );
    await fs.writeFile(marker, String(now), 'utf-8');
    return removed;
  } catch {
    return 0;
  }
}

/** 验证磁盘上的缓存内容，避免损坏或不完整的记录中断导出。 */
function isCacheEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== 'object') return false;
  const { timestamp, result } = value as Partial<CacheEntry>;
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return false;
  if (!result || typeof result !== 'object' || result.error) return false;
  if (typeof result.word !== 'string' || !result.word.trim()) return false;
  if (typeof result.pluginName !== 'string' || !result.pluginName.trim()) return false;
  if (
    !Array.isArray(result.translations) ||
    !result.translations.every(t => typeof t === 'string')
  ) {
    return false;
  }
  const { phonetic, examples } = result;
  if (phonetic !== undefined && typeof phonetic !== 'string') {
    if (!phonetic || typeof phonetic !== 'object' || Array.isArray(phonetic)) return false;
    if (phonetic.uk !== undefined && typeof phonetic.uk !== 'string') return false;
    if (phonetic.us !== undefined && typeof phonetic.us !== 'string') return false;
  }
  if (
    examples !== undefined &&
    (!Array.isArray(examples) ||
      !examples.every(e => e && typeof e.en === 'string' && typeof e.zh === 'string'))
  ) {
    return false;
  }
  return true;
}

/** 列出可导出的缓存；默认与查询使用相同的有效期判断，不修改任何缓存文件。 */
export async function readCacheEntries(
  ttlMs: number,
  includeExpired = false
): Promise<CacheEntry[]> {
  const directory = cacheDir();
  let files;
  try {
    files = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const now = Date.now();
  const entries: CacheEntry[] = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.json')) continue;
    try {
      const entry: unknown = JSON.parse(
        await fs.readFile(path.join(directory, file.name), 'utf-8')
      );
      if (!isCacheEntry(entry)) continue;
      if (!includeExpired && now - entry.timestamp >= ttlMs) continue;
      entries.push(entry);
    } catch {
      // 单个缓存损坏、无法读取或在导出期间被删除时，继续处理其他记录。
    }
  }
  return entries;
}

/** 清空整个缓存目录。 */
export async function clearCache(): Promise<void> {
  try {
    await fs.rm(cacheDir(), { recursive: true, force: true });
  } catch {
    // 忽略
  }
}

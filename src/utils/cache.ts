import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { TranslationResult } from '../types.js';

interface CacheEntry {
  timestamp: number;
  result: TranslationResult;
}

/** 缓存目录：可用 MINIDICT_CACHE_DIR 覆盖（便于测试与自定义存放位置）。 */
function cacheDir(): string {
  return process.env.MINIDICT_CACHE_DIR || path.join(os.homedir(), '.minidict', 'cache');
}

/** 把 (插件, 词) 映射为稳定、文件系统安全的缓存文件名。 */
function cacheFile(pluginName: string, word: string): string {
  const hash = crypto.createHash('sha1').update(`${pluginName}::${word}`).digest('hex');
  return path.join(cacheDir(), `${hash}.json`);
}

/**
 * 读取缓存。命中且未过期返回结果，否则返回 undefined。
 * 任何 I/O / 解析错误都视为未命中（缓存永不阻断正常查询）。
 */
export async function getCached(
  pluginName: string,
  word: string,
  ttlMs: number
): Promise<TranslationResult | undefined> {
  try {
    const content = await fs.readFile(cacheFile(pluginName, word), 'utf-8');
    const entry: CacheEntry = JSON.parse(content);
    if (!entry || typeof entry.timestamp !== 'number') return undefined;
    // 用 >= 使 ttl=0 始终视为过期（等价于禁用缓存），不依赖毫秒级耗时。
    if (Date.now() - entry.timestamp >= ttlMs) return undefined;
    return entry.result;
  } catch {
    return undefined;
  }
}

/**
 * 写入缓存。只缓存成功结果（带 error 的结果不缓存）。
 * 写入失败静默忽略（缓存是尽力而为的优化，不应影响主流程）。
 */
export async function setCached(
  pluginName: string,
  word: string,
  result: TranslationResult
): Promise<void> {
  if (result.error) return;
  try {
    await fs.mkdir(cacheDir(), { recursive: true });
    const entry: CacheEntry = { timestamp: Date.now(), result };
    await fs.writeFile(cacheFile(pluginName, word), JSON.stringify(entry), 'utf-8');
  } catch {
    // 忽略缓存写入错误
  }
}

/** 清空整个缓存目录。 */
export async function clearCache(): Promise<void> {
  try {
    await fs.rm(cacheDir(), { recursive: true, force: true });
  } catch {
    // 忽略
  }
}

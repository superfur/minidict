import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import type { ProxyConfig } from '../types.js';
import { fetchWithProxy } from './fetch.js';

const PACKAGE_NAME = 'minidict';
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface LatestInfo {
  version: string;
  enginesNode?: string;
}

export interface UpdateNotice {
  current: string;
  latest: string;
  /** 当新版本要求的 Node 版本高于当前运行版本时，给出最低要求版本（如 "18.0.0"）。 */
  requiredNode?: string;
}

interface UpdateState {
  lastCheck: number;
  latestVersion?: string;
  enginesNode?: string;
}

// ── 版本号比较（仅处理核心 x.y.z，不引入 semver 依赖） ──────────────────

/** a<b → -1，a>b → 1，相等 → 0。忽略预发布后缀（取 '-'/'+' 之前的核心部分）。 */
export function compareSemver(a: string, b: string): number {
  const core = (v: string): number[] =>
    String(v)
      .trim()
      .replace(/^v/, '')
      .split(/[-+]/)[0]
      .split('.')
      .map(n => parseInt(n, 10) || 0);
  const pa = core(a);
  const pb = core(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** 从 engines.node（如 ">=16.0.0"、"^18 || >=20"）解析出最低要求版本号。 */
export function parseMinNode(engines?: string): string | null {
  if (!engines) return null;
  const match = engines.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  const [, major, minor = '0', patch = '0'] = match;
  return `${major}.${minor}.${patch}`;
}

/** 当前 Node 是否满足最低要求版本。 */
export function nodeSatisfies(current: string, required: string): boolean {
  return compareSemver(current, required) >= 0;
}

// ── 包管理器检测与升级命令 ─────────────────────────────────────────────

/** 依据可执行文件所在路径推断全局安装来源的包管理器；无法判断时回退 npm。 */
export function detectPackageManager(modulePath: string): PackageManager {
  const p = modulePath.replace(/\\/g, '/').toLowerCase();
  if (p.includes('/.bun/') || p.includes('/bun/')) return 'bun';
  if (p.includes('pnpm')) return 'pnpm';
  if (p.includes('/yarn/') || p.includes('/.config/yarn/') || p.includes('/.yarn/')) return 'yarn';
  return 'npm';
}

/** 返回某包管理器的全局升级命令（argv 形式）。 */
export function upgradeCommand(pm: PackageManager): string[] {
  const target = `${PACKAGE_NAME}@latest`;
  switch (pm) {
    case 'pnpm':
      return ['pnpm', 'add', '-g', target];
    case 'yarn':
      return ['yarn', 'global', 'add', target];
    case 'bun':
      return ['bun', 'add', '-g', target];
    case 'npm':
    default:
      return ['npm', 'install', '-g', target];
  }
}

/** 跨平台探测某命令是否存在于 PATH。 */
export function commandExists(cmd: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [cmd] : ['-v', cmd];
  try {
    const res = spawnSync(probe, args, { stdio: 'ignore', shell: process.platform === 'win32' });
    return res.status === 0;
  } catch {
    return false;
  }
}

// ── registry 查询 ──────────────────────────────────────────────────────

/** 查询 npm registry 最新版本与其 Node 引擎要求。任何错误都返回 null（绝不抛）。 */
export async function fetchLatest(
  proxy?: ProxyConfig,
  timeoutMs: number = 4000
): Promise<LatestInfo | null> {
  try {
    const resp = await fetchWithProxy(
      REGISTRY_URL,
      { headers: { Accept: 'application/json' } },
      proxy,
      timeoutMs,
      0
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { version?: string; engines?: { node?: string } };
    if (!data?.version) return null;
    return { version: data.version, enginesNode: data.engines?.node };
  } catch {
    return null;
  }
}

// ── 检查状态文件（节流） ───────────────────────────────────────────────

function stateDir(): string {
  return process.env.MINIDICT_STATE_DIR || path.join(os.homedir(), '.minidict');
}

function stateFile(): string {
  return path.join(stateDir(), 'update-check.json');
}

async function readState(): Promise<UpdateState | null> {
  try {
    const content = await fs.readFile(stateFile(), 'utf-8');
    const state = JSON.parse(content) as UpdateState;
    if (!state || typeof state.lastCheck !== 'number') return null;
    return state;
  } catch {
    return null;
  }
}

async function writeState(state: UpdateState): Promise<void> {
  try {
    await fs.mkdir(stateDir(), { recursive: true });
    await fs.writeFile(stateFile(), JSON.stringify(state), 'utf-8');
  } catch {
    // 忽略状态写入错误（更新检查是尽力而为）
  }
}

function buildNotice(current: string, info: LatestInfo): UpdateNotice | null {
  if (compareSemver(info.version, current) <= 0) return null;
  const minNode = parseMinNode(info.enginesNode);
  const requiredNode = minNode && !nodeSatisfies(process.version, minNode) ? minNode : undefined;
  return { current, latest: info.version, requiredNode };
}

export interface CheckOptions {
  current: string;
  proxy?: ProxyConfig;
  timeout?: number;
  intervalMs?: number;
}

/**
 * 节流式检查更新：距上次检查不足 interval 时仅用本地缓存判断、不发网络请求；
 * 否则查询 registry 并写回状态。无更新或出错返回 null。
 */
export async function checkForUpdate(opts: CheckOptions): Promise<UpdateNotice | null> {
  const { current, proxy, timeout = 4000, intervalMs = DAY_MS } = opts;
  try {
    const state = await readState();
    const fresh = state && Date.now() - state.lastCheck < intervalMs;

    if (fresh) {
      if (!state!.latestVersion) return null;
      return buildNotice(current, {
        version: state!.latestVersion,
        enginesNode: state!.enginesNode
      });
    }

    const info = await fetchLatest(proxy, timeout);
    // 无论成功与否都记录本次检查时间，避免反复触网。
    await writeState({
      lastCheck: Date.now(),
      latestVersion: info?.version ?? state?.latestVersion,
      enginesNode: info?.enginesNode ?? state?.enginesNode
    });

    if (!info) return null;
    return buildNotice(current, info);
  } catch {
    return null;
  }
}

// ── dict -u 升级主流程 ─────────────────────────────────────────────────

export interface RunUpdateOptions {
  current: string;
  proxy?: ProxyConfig;
  timeout?: number;
  /** 仅打印将执行的命令、不真正运行（便于自测/CI）。 */
  dryRun?: boolean;
  /** 用于检测包管理器的路径；默认取被执行脚本路径（全局 bin 路径含 PM 标记）。 */
  modulePath?: string;
}

export interface RunUpdateResult {
  status: 'latest' | 'upgraded' | 'node-too-old' | 'pm-missing' | 'failed' | 'check-failed';
  current: string;
  latest?: string;
  requiredNode?: string;
  packageManager?: PackageManager;
  command?: string;
}

/**
 * `dict -u` 主流程：查询最新版 → 已最新则返回 latest；否则检测包管理器、
 * 校验 Node 版本与包管理器可用性，最后执行（或 dryRun 打印）全局升级命令。
 * 返回结构化结果，由 CLI 负责呈现，便于测试。
 */
export async function runUpdate(opts: RunUpdateOptions): Promise<RunUpdateResult> {
  const { current, proxy, timeout = 8000, dryRun = false } = opts;
  const modulePath = opts.modulePath ?? process.argv[1] ?? '';

  const info = await fetchLatest(proxy, timeout);
  if (!info) {
    return { status: 'check-failed', current };
  }

  if (compareSemver(info.version, current) <= 0) {
    return { status: 'latest', current, latest: info.version };
  }

  // 新版本要求的 Node 高于当前 → 先警告并中止，不强行升级到跑不起来的版本。
  const minNode = parseMinNode(info.enginesNode);
  if (minNode && !nodeSatisfies(process.version, minNode)) {
    return { status: 'node-too-old', current, latest: info.version, requiredNode: minNode };
  }

  const pm = detectPackageManager(modulePath);
  const cmd = upgradeCommand(pm);
  const command = cmd.join(' ');

  // 包管理器二进制缺失 → 降级为提示手动命令（npm 缺失尤其要明确告知）。
  if (!commandExists(cmd[0])) {
    return { status: 'pm-missing', current, latest: info.version, packageManager: pm, command };
  }

  if (dryRun) {
    return { status: 'upgraded', current, latest: info.version, packageManager: pm, command };
  }

  const res = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
  if (res.status === 0) {
    return { status: 'upgraded', current, latest: info.version, packageManager: pm, command };
  }
  return { status: 'failed', current, latest: info.version, packageManager: pm, command };
}

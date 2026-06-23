import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  compareSemver,
  parseMinNode,
  nodeSatisfies,
  detectPackageManager,
  upgradeCommand,
  fetchLatest,
  checkForUpdate
} from '../src/utils/update.js';

describe('compareSemver', () => {
  it('orders core versions numerically', () => {
    expect(compareSemver('2.6.0', '2.5.0')).toBe(1);
    expect(compareSemver('2.5.0', '2.6.0')).toBe(-1);
    expect(compareSemver('2.6.0', '2.6.0')).toBe(0);
  });

  it('does not compare lexically (10 > 9)', () => {
    expect(compareSemver('2.10.0', '2.9.0')).toBe(1);
  });

  it('tolerates leading v and prerelease/build suffixes', () => {
    expect(compareSemver('v2.6.0', '2.6.0')).toBe(0);
    expect(compareSemver('2.6.0-beta.1', '2.6.0')).toBe(0); // 仅比较核心
  });

  it('handles uneven segment counts', () => {
    expect(compareSemver('2.6', '2.6.0')).toBe(0);
    expect(compareSemver('2.6.1', '2.6')).toBe(1);
  });
});

describe('parseMinNode / nodeSatisfies', () => {
  it('extracts the minimum node version', () => {
    expect(parseMinNode('>=16.0.0')).toBe('16.0.0');
    expect(parseMinNode('^18 || >=20')).toBe('18.0.0');
    expect(parseMinNode('18')).toBe('18.0.0');
  });

  it('returns null for missing/garbage engines', () => {
    expect(parseMinNode(undefined)).toBeNull();
    expect(parseMinNode('*')).toBeNull();
  });

  it('checks satisfaction', () => {
    expect(nodeSatisfies('v18.19.0', '16.0.0')).toBe(true);
    expect(nodeSatisfies('v14.0.0', '16.0.0')).toBe(false);
    expect(nodeSatisfies('v16.0.0', '16.0.0')).toBe(true);
  });
});

describe('detectPackageManager', () => {
  it('detects bun', () => {
    expect(
      detectPackageManager('/Users/x/.bun/install/global/node_modules/minidict/dist/cli.js')
    ).toBe('bun');
  });
  it('detects pnpm', () => {
    expect(
      detectPackageManager('/Users/x/Library/pnpm/global/5/node_modules/minidict/dist/cli.js')
    ).toBe('pnpm');
  });
  it('detects yarn', () => {
    expect(
      detectPackageManager('/Users/x/.config/yarn/global/node_modules/minidict/dist/cli.js')
    ).toBe('yarn');
  });
  it('defaults to npm', () => {
    expect(detectPackageManager('/usr/local/lib/node_modules/minidict/dist/cli.js')).toBe('npm');
  });
});

describe('upgradeCommand', () => {
  it('maps each package manager to its global upgrade command', () => {
    expect(upgradeCommand('npm')).toEqual(['npm', 'install', '-g', 'minidict@latest']);
    expect(upgradeCommand('pnpm')).toEqual(['pnpm', 'add', '-g', 'minidict@latest']);
    expect(upgradeCommand('yarn')).toEqual(['yarn', 'global', 'add', 'minidict@latest']);
    expect(upgradeCommand('bun')).toEqual(['bun', 'add', '-g', 'minidict@latest']);
  });
});

describe('fetchLatest (network mocked to throw)', () => {
  it('returns null instead of throwing when the request fails', async () => {
    await expect(fetchLatest(undefined, 100)).resolves.toBeNull();
  });
});

describe('checkForUpdate state file', () => {
  const tmpDir = path.join(os.tmpdir(), `minidict-update-test-${process.pid}`);

  beforeAll(() => {
    process.env.MINIDICT_STATE_DIR = tmpDir;
  });
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.MINIDICT_STATE_DIR;
  });

  it('uses a fresh cached state without hitting the network', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now(), latestVersion: '9.9.9', enginesNode: '>=16.0.0' })
    );

    const notice = await checkForUpdate({ current: '2.6.0', intervalMs: 60_000 });
    expect(notice).not.toBeNull();
    expect(notice?.latest).toBe('9.9.9');
    expect(notice?.requiredNode).toBeUndefined(); // 当前 Node 满足 16
  });

  it('returns null from fresh cache when cached version is not newer', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now(), latestVersion: '1.0.0' })
    );

    const notice = await checkForUpdate({ current: '2.6.0', intervalMs: 60_000 });
    expect(notice).toBeNull();
  });

  it('flags requiredNode when the cached latest needs a newer node', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'update-check.json'),
      JSON.stringify({ lastCheck: Date.now(), latestVersion: '9.9.9', enginesNode: '>=999.0.0' })
    );

    const notice = await checkForUpdate({ current: '2.6.0', intervalMs: 60_000 });
    expect(notice?.requiredNode).toBe('999.0.0');
  });

  it('does not throw when the state is stale and the network is unavailable', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'update-check.json'),
      JSON.stringify({ lastCheck: 0, latestVersion: '9.9.9' })
    );
    // 过期 → 触发 fetchLatest（已被 mock 抛错）→ 返回 null，且写回 lastCheck
    const notice = await checkForUpdate({ current: '2.6.0', intervalMs: 60_000, timeout: 100 });
    expect(notice).toBeNull();
  });
});

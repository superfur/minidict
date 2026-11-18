import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parseProxyUrl, getProxyFromEnv, loadConfig } from '../src/config.js';
import { getProxyUrl, getProxyAgent } from '../src/utils/fetch.js';
import type { ProxyConfig } from '../src/types.js';

const PROXY_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy'
];

describe('parseProxyUrl', () => {
  it('parses host, port and protocol', () => {
    expect(parseProxyUrl('http://127.0.0.1:7890')).toEqual({
      protocol: 'http',
      host: '127.0.0.1',
      port: 7890,
      username: undefined,
      password: undefined
    });
  });

  it('falls back to the protocol default port when the port is omitted or default', () => {
    expect(parseProxyUrl('http://proxy.local')?.port).toBe(80);
    expect(parseProxyUrl('http://proxy.local:80')?.port).toBe(80);
    expect(parseProxyUrl('https://proxy.local:443')?.port).toBe(443);
    expect(parseProxyUrl('socks5://proxy.local')?.port).toBe(1080);
  });

  it('accepts socks / socks5h schemes', () => {
    expect(parseProxyUrl('socks5h://127.0.0.1:1080')?.protocol).toBe('socks5h');
    expect(parseProxyUrl('socks://127.0.0.1:1080')?.protocol).toBe('socks');
  });

  it('decodes credentials so they are not double-encoded later', () => {
    const proxy = parseProxyUrl('http://user:p%40ss@host:8080') as ProxyConfig;
    expect(proxy.password).toBe('p@ss');
    expect(getProxyUrl(proxy)).toBe('http://user:p%40ss@host:8080');
  });

  it('keeps username-only credentials', () => {
    const proxy = parseProxyUrl('http://token@host:8080') as ProxyConfig;
    expect(proxy.username).toBe('token');
    expect(getProxyUrl(proxy)).toBe('http://token@host:8080');
  });

  it('rejects unsupported schemes and garbage', () => {
    expect(parseProxyUrl('ftp://host:21')).toBeNull();
    expect(parseProxyUrl('not a url')).toBeNull();
  });
});

describe('getProxyAgent', () => {
  it('throws on an unsupported protocol instead of silently going direct', async () => {
    const bad = { protocol: 'ftp', host: 'h', port: 1 } as unknown as ProxyConfig;
    await expect(getProxyAgent(bad)).rejects.toThrow(/不支持的代理协议/);
  });
});

describe('getProxyFromEnv', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of PROXY_VARS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of PROXY_VARS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('prefers HTTPS_PROXY over HTTP_PROXY (all requests are https)', () => {
    process.env.HTTP_PROXY = 'http://plain:1111';
    process.env.HTTPS_PROXY = 'http://secure:2222';
    expect(getProxyFromEnv()?.host).toBe('secure');
  });

  it('skips an unparsable value and tries the next variable', () => {
    process.env.HTTPS_PROXY = 'garbage';
    process.env.ALL_PROXY = 'socks5://127.0.0.1:1080';
    expect(getProxyFromEnv()?.protocol).toBe('socks5');
  });

  it('returns undefined when nothing is set', () => {
    expect(getProxyFromEnv()).toBeUndefined();
  });
});

describe('loadConfig', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'minidict-config-test-'));
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('merges a valid config file over the defaults', async () => {
    const file = path.join(dir, 'ok.json');
    await fs.writeFile(file, JSON.stringify({ plugins: ['bing'], proxy: 'http://h:8080' }));
    const config = await loadConfig(file);
    expect(config.plugins).toEqual(['bing']);
    expect(config.maxExamples).toBe(3);
    expect(config.proxy).toMatchObject({ protocol: 'http', host: 'h', port: 8080 });
  });

  it('throws on invalid JSON instead of silently using defaults', async () => {
    const file = path.join(dir, 'bad.json');
    await fs.writeFile(file, '{ "plugins": ["bing"], }');
    await expect(loadConfig(file)).rejects.toThrow(/不是合法的 JSON/);
  });

  it('throws when an explicitly given config path does not exist', async () => {
    await expect(loadConfig(path.join(dir, 'missing.json'))).rejects.toThrow(/无法读取配置文件/);
  });
});

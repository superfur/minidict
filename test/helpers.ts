import { vi } from 'vitest';
import fetch from 'node-fetch';

export const fetchMock = vi.mocked(fetch);

/** 构造一个最小可用的假 Response。 */
export function fakeResponse(body: unknown, status: number = 200): never {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => text,
    json: async () => JSON.parse(text)
  } as never;
}

/** 让接下来的 N 次请求依次返回给定响应。 */
export function queueResponses(...responses: Array<{ body: unknown; status?: number }>): void {
  for (const r of responses) {
    fetchMock.mockImplementationOnce(async () => fakeResponse(r.body, r.status ?? 200));
  }
}

/** 去掉 ANSI 颜色码。 */
export function strip(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}

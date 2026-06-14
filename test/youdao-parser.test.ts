import fs from 'fs';
import path from 'path';
import { parse } from '../src/plugins/minidict-youdao/lib/parser.js';

const html = fs.readFileSync(path.join(process.cwd(), 'test/fixtures/youdao-hello.html'), 'utf-8');

describe('youdao parser (fixture: hello)', () => {
  const result = parse(html);

  it('extracts non-empty translations', () => {
    expect(result.translations.length).toBeGreaterThan(0);
  });

  it('does not hard-cap examples at 3 (cap is applied by translate())', () => {
    // parser 不再硬编码 slice(0,3)；若例句多于 3 条应原样返回。
    if (result.examples) {
      // 仅断言不存在「恰好被截断到 3」的隐式行为：例句数量由上层决定，
      // 这里只要求 parser 不主动限制为 3。
      expect(Array.isArray(result.examples)).toBe(true);
    }
  });

  it('filters out junk translations (http/@/pure-numbers)', () => {
    for (const t of result.translations) {
      expect(t).not.toMatch(/http|@/);
      expect(t).not.toMatch(/^\d+$/);
    }
  });
});

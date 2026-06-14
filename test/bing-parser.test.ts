import fs from 'fs';
import path from 'path';
import { parse } from '../src/plugins/minidict-bing/lib/parser.js';

const html = fs.readFileSync(path.join(process.cwd(), 'test/fixtures/bing-hello.html'), 'utf-8');

describe('bing parser (fixture: hello)', () => {
  const result = parse(html);

  it('extracts non-empty translations', () => {
    expect(result.translations.length).toBeGreaterThan(0);
    expect(result.translations.join(' ')).toMatch(/你好|喂/);
  });

  it('maps UK/US phonetics correctly and strips label prefixes', () => {
    const phonetic = result.phonetic;
    expect(typeof phonetic).toBe('object');
    if (phonetic && typeof phonetic === 'object') {
      // 应只含音标符号，不含「美/英/US/UK」标签或方括号
      expect(phonetic.uk).toBeTruthy();
      expect(phonetic.us).toBeTruthy();
      for (const p of [phonetic.uk, phonetic.us]) {
        expect(p).not.toMatch(/美|英|US|UK|\[|\]/);
      }
      // hello 的英式发音以 h 开头的 schwa 音；两者不应相同（DOM 中 hd_pr≠hd_prUS）
      expect(phonetic.uk).not.toBe(phonetic.us);
    }
  });

  it('does not return the "no results" suggestion text as a translation', () => {
    expect(result.translations.join(' ')).not.toMatch(/Ensure words are spelled/i);
  });
});

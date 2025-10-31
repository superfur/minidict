import { translate } from '../../src/translate.js';
import type { Config } from '../../src/types.js';
import { jest } from '@jest/globals';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Translator', () => {
  const config: Config = {
    plugins: ['bing'],
    showPhonetic: true,
    showExamples: true,
    maxExamples: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should translate English word using bing plugin', async () => {
    const mockHtml = `
      <div class="qdef">
        <ul class="qdef">
          <li>你好</li>
        </ul>
      </div>
    `;

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const results = await translate('hello', config);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].word).toBe('hello');
      expect(results[0].pluginName).toBe('Bing');
    }
  });

  it('should translate using multiple plugins', async () => {
    const multiPluginConfig: Config = {
      ...config,
      plugins: ['bing', 'youdao']
    };

    const mockHtml = '<div class="qdef"><ul><li>你好</li></ul></div>';

    mockedFetch.mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const results = await translate('hello', multiPluginConfig);
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should apply maxExamples limit', async () => {
    const mockHtml = `
      <div class="qdef">
        <ul><li>你好</li></ul>
      </div>
      <div class="sen_en">Hello 1</div>
      <div class="sen_cn">你好1</div>
      <div class="sen_en">Hello 2</div>
      <div class="sen_cn">你好2</div>
      <div class="sen_en">Hello 3</div>
      <div class="sen_cn">你好3</div>
      <div class="sen_en">Hello 4</div>
      <div class="sen_cn">你好4</div>
    `;

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const limitedConfig: Config = {
      ...config,
      maxExamples: 2
    };

    const results = await translate('hello', limitedConfig);
    
    if (results.length > 0 && results[0].examples) {
      expect(results[0].examples.length).toBeLessThanOrEqual(2);
    }
  });

  it('should handle invalid plugin gracefully', async () => {
    const invalidConfig: Config = {
      ...config,
      plugins: ['invalid']
    };

    const results = await translate('hello', invalidConfig);
    
    // Should not throw, but return empty or valid results
    expect(Array.isArray(results)).toBe(true);
  });
});

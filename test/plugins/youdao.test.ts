import youdaoPlugin from '../../src/plugins/minidict-youdao/index.js';
import { jest } from '@jest/globals';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Youdao Translator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should translate English word', async () => {
    const mockHtml = `
      <div class="pronounce">
        <span class="phonetic">[həˈləʊ]</span>
        <span class="phonetic">[həˈləʊ]</span>
      </div>
      <div id="phrsListTab">
        <div class="trans-container">
          <li>你好</li>
          <li>喂</li>
        </div>
      </div>
      <div id="authority">
        <li>
          <div class="sen-en">Hello, how are you?</div>
          <div class="sen-ch">你好，你好吗？</div>
        </li>
      </div>
    `;

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const result = await youdaoPlugin.translate('hello');
    
    expect(result).toBeDefined();
    expect(result.word).toBe('hello');
    expect(result.translations.length).toBeGreaterThan(0);
    expect(result.pluginName).toBe('Youdao');
    expect(result.phonetic).toBeDefined();
    if (result.phonetic && typeof result.phonetic !== 'string') {
      expect(result.phonetic.uk || result.phonetic.us).toBeDefined();
    }
    if (result.examples && result.examples.length > 0) {
      expect(result.examples[0]).toHaveProperty('en');
      expect(result.examples[0]).toHaveProperty('zh');
    }
  });

  it('should translate phrase using translation API', async () => {
    const mockResponse = {
      fanyi: {
        tran: '你好世界'
      }
    };

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
      json: async () => mockResponse,
    } as any);

    const result = await youdaoPlugin.translate('hello world');
    
    expect(result).toBeDefined();
    expect(result.word).toBe('hello world');
    expect(result.translations).toContain('你好世界');
    expect(result.pluginName).toBe('Youdao');
  });

  it('should handle network errors', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(youdaoPlugin.translate('test')).rejects.toThrow();
  });

  it('should handle invalid HTML response', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<div>Invalid HTML</div>',
      json: async () => ({}),
    } as any);

    const result = await youdaoPlugin.translate('test');
    
    // Should still return a result, even if empty
    expect(result).toBeDefined();
    expect(result.pluginName).toBe('Youdao');
  });
});

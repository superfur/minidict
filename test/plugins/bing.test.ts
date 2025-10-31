import bingPlugin from '../../src/plugins/minidict-bing/index.js';
import { jest } from '@jest/globals';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Bing Translator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should translate English word', async () => {
    const mockHtml = `
      <div class="qdef">
        <div class="hd_area">
          <span class="hd_prUS">[həˈləʊ]</span>
          <span class="hd_pr">[həˈləʊ]</span>
        </div>
        <ul class="qdef">
          <li>你好</li>
          <li>喂</li>
        </ul>
        <div class="se_li1">
          <div class="sen_en">Hello, how are you?</div>
          <div class="sen_cn">你好，你好吗？</div>
        </div>
      </div>
    `;

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
      json: async () => ({}),
    } as any);

    const result = await bingPlugin.translate('hello');
    
    expect(result).toBeDefined();
    expect(result.word).toBe('hello');
    expect(result.translations).toContain('你好');
    expect(result.pluginName).toBe('Bing');
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
      statusCode: 200,
      translations: [
        { text: '你好世界', to: 'zh-Hans' }
      ]
    };

    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
      json: async () => mockResponse,
    } as any);

    const result = await bingPlugin.translate('hello world');
    
    expect(result).toBeDefined();
    expect(result.word).toBe('hello world');
    expect(result.translations).toContain('你好世界');
    expect(result.pluginName).toBe('Bing');
  });

  it('should handle network errors', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(bingPlugin.translate('test')).rejects.toThrow();
  });

  it('should handle invalid HTML response', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<div>Invalid HTML</div>',
      json: async () => ({}),
    } as any);

    const result = await bingPlugin.translate('test');
    
    // Should still return a result, even if empty
    expect(result).toBeDefined();
    expect(result.pluginName).toBe('Bing');
  });
});

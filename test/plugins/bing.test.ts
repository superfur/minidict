import { BingTranslator } from '../../src/plugins/bing';
import axios from 'axios';
import * as cheerio from 'cheerio';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Bing Translator', () => {
  const translator = new BingTranslator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(translator.name).toBe('bing');
  });

  it('should translate English to Chinese', async () => {
    const mockHtml = `
      <div class="qdef">
        <div class="hd_area">
          <h1>hello</h1>
          <div class="hd_tf_lh">
            <span class="pos">int.</span>
            <span class="b_primtxt">/həˈləʊ/</span>
          </div>
        </div>
        <div class="def_area">
          <ul>
            <li>你好</li>
            <li>喂</li>
          </ul>
        </div>
        <div class="se_li1">
          <div class="sen_en">Hello, how are you?</div>
          <div class="sen_cn">你好，你好吗？</div>
        </div>
      </div>
    `;

    mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await translator.translate('hello');
    expect(result).toBeDefined();
    expect(result.word).toBe('hello');
    expect(result.translations).toEqual(['你好', '喂']);
    expect(result.phonetic).toBe('/həˈləʊ/');
    expect(result.examples).toEqual([
      { en: 'Hello, how are you?', zh: '你好，你好吗？' }
    ]);
    expect(result.source).toBe('Bing Dictionary');
  });

  it('should translate Chinese to English', async () => {
    const mockHtml = `
      <div class="qdef">
        <div class="hd_area">
          <h1>你好</h1>
          <div class="hd_tf_lh">
            <span class="pos">int.</span>
            <span class="b_primtxt">/nǐ hǎo/</span>
          </div>
        </div>
        <div class="def_area">
          <ul>
            <li>hello</li>
            <li>hi</li>
          </ul>
        </div>
        <div class="se_li1">
          <div class="sen_en">Hello, nice to meet you.</div>
          <div class="sen_cn">你好，很高兴见到你。</div>
        </div>
      </div>
    `;

    mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await translator.translate('你好');
    expect(result).toBeDefined();
    expect(result.word).toBe('你好');
    expect(result.translations).toEqual(['hello', 'hi']);
    expect(result.phonetic).toBe('/nǐ hǎo/');
    expect(result.examples).toEqual([
      { en: 'Hello, nice to meet you.', zh: '你好，很高兴见到你。' }
    ]);
    expect(result.source).toBe('Bing Dictionary');
  });

  it('should handle empty input', async () => {
    await expect(translator.translate('')).rejects.toThrow('翻译内容不能为空');
  });

  it('should handle network errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    await expect(translator.translate('test')).rejects.toThrow('Bing 词典服务暂时不可用');
  });

  it('should handle invalid HTML response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '<div>Invalid HTML</div>' });
    await expect(translator.translate('test')).rejects.toThrow('未找到翻译结果');
  });
}); 
import { YoudaoTranslator } from '../../src/plugins/youdao';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Youdao Translator', () => {
  const translator = new YoudaoTranslator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(translator.name).toBe('youdao');
  });

  it('should translate English to Chinese', async () => {
    const mockResponse = {
      ec: {
        word: [
          {
            usphone: 'həˈloʊ',
            trs: [
              { tr: ['你好'] },
              { tr: ['喂'] }
            ]
          }
        ],
        exam_type: ['初中', '高中'],
        sentence: [
          {
            sentence: 'Hello, how are you?',
            translation: '你好，你好吗？'
          }
        ]
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await translator.translate('hello');
    expect(result).toBeDefined();
    expect(result.word).toBe('hello');
    expect(result.translations).toEqual(['你好', '喂']);
    expect(result.phonetic).toBe('həˈloʊ');
    expect(result.examples).toEqual([
      { en: 'Hello, how are you?', zh: '你好，你好吗？' }
    ]);
    expect(result.source).toBe('Youdao Dictionary');
  });

  it('should translate Chinese to English', async () => {
    const mockResponse = {
      ce: {
        word: [
          {
            phone: 'nǐ hǎo',
            trs: [
              { tr: ['hello'] },
              { tr: ['hi'] }
            ]
          }
        ],
        sentence: [
          {
            sentence: '你好，很高兴见到你。',
            translation: 'Hello, nice to meet you.'
          }
        ]
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await translator.translate('你好');
    expect(result).toBeDefined();
    expect(result.word).toBe('你好');
    expect(result.translations).toEqual(['hello', 'hi']);
    expect(result.phonetic).toBe('nǐ hǎo');
    expect(result.examples).toEqual([
      { en: 'Hello, nice to meet you.', zh: '你好，很高兴见到你。' }
    ]);
    expect(result.source).toBe('Youdao Dictionary');
  });

  it('should handle empty input', async () => {
    await expect(translator.translate('')).rejects.toThrow('翻译内容不能为空');
  });

  it('should handle network errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    await expect(translator.translate('test')).rejects.toThrow('有道词典服务暂时不可用');
  });

  it('should handle invalid response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    await expect(translator.translate('test')).rejects.toThrow('未找到翻译结果');
  });
}); 
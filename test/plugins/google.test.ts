import { GoogleTranslator } from '../../src/plugins/google';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Google Translator', () => {
  const translator = new GoogleTranslator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct name', () => {
    expect(translator.name).toBe('google');
  });

  it('should translate English to Chinese', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        [['你好', 'hello']],
        null,
        [['hello', null, 'həˈlō']]
      ]
    });

    const result = await translator.translate('hello');
    expect(result).toBeDefined();
    expect(result.word).toBe('hello');
    expect(result.translations).toEqual(['你好']);
    expect(result.phonetic).toBe('həˈlō');
    expect(result.source).toBe('Google Translate');
  });

  it('should translate Chinese to English', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        [['hello', '你好']],
        null,
        [['你好', null, 'nǐ hǎo']]
      ]
    });

    const result = await translator.translate('你好');
    expect(result).toBeDefined();
    expect(result.word).toBe('你好');
    expect(result.translations).toEqual(['hello']);
    expect(result.phonetic).toBe('nǐ hǎo');
    expect(result.source).toBe('Google Translate');
  });

  it('should handle empty input', async () => {
    await expect(translator.translate('')).rejects.toThrow('翻译内容不能为空');
  });

  it('should handle network errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    await expect(translator.translate('test')).rejects.toThrow('Google 翻译服务暂时不可用');
  });
}); 
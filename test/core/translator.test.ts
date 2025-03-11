import { translate } from '../../src/core/translator';
import type { Config } from '../../src/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Translator', () => {
  const config: Config = {
    plugins: ['google'],
    showPhonetic: true,
    showExamples: true,
    maxExamples: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should translate English to Chinese', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        [['你好', 'hello']],
        null,
        [['hello', null, 'həˈlō']]
      ]
    });

    const result = await translate('hello', config);
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

    const result = await translate('你好', config);
    expect(result).toBeDefined();
    expect(result.word).toBe('你好');
    expect(result.translations).toEqual(['hello']);
    expect(result.phonetic).toBe('nǐ hǎo');
    expect(result.source).toBe('Google Translate');
  });

  it('should handle invalid plugin', async () => {
    const invalidConfig: Config = {
      ...config,
      plugins: ['invalid']
    };
    await expect(translate('hello', invalidConfig)).rejects.toThrow('未找到词典插件');
  });
}); 
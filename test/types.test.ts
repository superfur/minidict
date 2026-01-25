// Simple type tests that don't require module imports
describe('Type Definitions', () => {
  it('TranslationResult should allow word property', () => {
    const result = {
      word: 'test',
      translations: ['测试'],
      pluginName: 'Test'
    };
    expect(result.word).toBe('test');
  });

  it('TranslationResult should allow optional phonetic', () => {
    const result = {
      word: 'hello',
      translations: ['你好'],
      pluginName: 'Test',
      phonetic: '[həˈləʊ]'
    };
    expect(result.phonetic).toBe('[həˈləʊ]');
  });

  it('TranslationResult should allow object phonetic', () => {
    const result = {
      word: 'hello',
      translations: ['你好'],
      pluginName: 'Test',
      phonetic: {
        uk: 'həˈləʊ',
        us: 'həˈloʊ'
      }
    };
    expect(result.phonetic.uk).toBe('həˈləʊ');
    expect(result.phonetic.us).toBe('həˈloʊ');
  });

  it('TranslationResult should allow examples', () => {
    const result = {
      word: 'hello',
      translations: ['你好'],
      pluginName: 'Test',
      examples: [
        { en: 'Hello world', zh: '你好世界' }
      ]
    };
    expect(result.examples.length).toBe(1);
    expect(result.examples[0].en).toBe('Hello world');
  });
});

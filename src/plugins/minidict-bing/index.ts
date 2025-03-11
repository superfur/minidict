import type { DictionaryPlugin, TranslationResult } from '../../types.js';
import { translate } from './lib/translator.js';

class BingTranslator implements DictionaryPlugin {
  async translate(word: string): Promise<TranslationResult> {
    try {
      const result = await translate(word);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '必应词典插件执行失败');
    }
  }
}

const translator = new BingTranslator();

export default translator; 
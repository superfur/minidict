import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
import { translate } from './lib/translator.js';

class BingTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  async translate(word: string): Promise<TranslationResult> {
    try {
      const result = await translate(word, this.proxy);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '必应词典插件执行失败');
    }
  }
}

const translator = new BingTranslator();

export default translator;
export { BingTranslator };
 
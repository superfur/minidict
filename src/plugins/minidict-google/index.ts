import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
import { translate } from './lib/translator.js';

class GoogleTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await translate(text, this.proxy);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Google 词典插件执行失败');
    }
  }
}

const translator = new GoogleTranslator();

export default translator;
export { GoogleTranslator };

import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
import { translate } from './lib/translator.js';

class GoogleTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;
  private timeoutMs: number = 3000;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  setTimeout(timeoutMs: number): void {
    this.timeoutMs = timeoutMs;
  }

  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await translate(text, this.proxy, this.timeoutMs);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Google 词典插件执行失败');
    }
  }
}

const translator = new GoogleTranslator();

export default translator;
export { GoogleTranslator };

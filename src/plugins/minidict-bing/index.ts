import type { DictionaryPlugin, TranslationResult, ProxyConfig } from '../../types.js';
import { translate } from './lib/translator.js';

class BingTranslator implements DictionaryPlugin {
  private proxy?: ProxyConfig;
  private timeoutMs: number = 3000;

  setProxy(proxy?: ProxyConfig): void {
    this.proxy = proxy;
  }

  setTimeout(timeoutMs: number): void {
    this.timeoutMs = timeoutMs;
  }

  async translate(word: string): Promise<TranslationResult> {
    try {
      const result = await translate(word, this.proxy, this.timeoutMs);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '必应词典插件执行失败');
    }
  }
}

const translator = new BingTranslator();

export default translator;
export { BingTranslator };
 
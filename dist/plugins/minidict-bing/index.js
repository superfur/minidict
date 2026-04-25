import { translate } from './lib/translator.js';
class BingTranslator {
    constructor() {
        this.timeoutMs = 10000;
    }
    setProxy(proxy) {
        this.proxy = proxy;
    }
    setTimeout(timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
    async translate(word) {
        try {
            const result = await translate(word, this.proxy, this.timeoutMs);
            return result;
        }
        catch (error) {
            throw new Error(error instanceof Error ? error.message : '必应词典插件执行失败');
        }
    }
}
const translator = new BingTranslator();
export default translator;
export { BingTranslator };

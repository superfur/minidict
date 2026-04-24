import { translate } from './lib/translator.js';
class GoogleTranslator {
    constructor() {
        this.timeoutMs = 3000;
    }
    setProxy(proxy) {
        this.proxy = proxy;
    }
    setTimeout(timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
    async translate(text) {
        try {
            const result = await translate(text, this.proxy, this.timeoutMs);
            return result;
        }
        catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Google 词典插件执行失败');
        }
    }
}
const translator = new GoogleTranslator();
export default translator;
export { GoogleTranslator };

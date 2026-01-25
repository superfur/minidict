import { translate } from './lib/translator.js';
class BingTranslator {
    setProxy(proxy) {
        this.proxy = proxy;
    }
    async translate(word) {
        try {
            const result = await translate(word, this.proxy);
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

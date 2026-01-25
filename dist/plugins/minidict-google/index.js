import { translate } from './lib/translator.js';
class GoogleTranslator {
    setProxy(proxy) {
        this.proxy = proxy;
    }
    async translate(text) {
        try {
            const result = await translate(text, this.proxy);
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

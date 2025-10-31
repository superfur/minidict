import bingPlugin from './plugins/minidict-bing/index.js';
import youdaoPlugin from './plugins/minidict-youdao/index.js';
export async function translate(word, config) {
    const results = [];
    const plugins = config.plugins || ['bing', 'youdao'];
    for (const plugin of plugins) {
        try {
            let result;
            if (plugin === 'bing') {
                result = await bingPlugin.translate(word);
            }
            else if (plugin === 'youdao') {
                result = await youdaoPlugin.translate(word);
            }
            else {
                console.error(`未知的插件: ${plugin}`);
                continue;
            }
            // 应用配置的maxExamples限制
            if (result.examples && config.maxExamples) {
                result.examples = result.examples.slice(0, config.maxExamples);
            }
            results.push(result);
        }
        catch (error) {
            console.error(`${plugin}插件执行失败:`, error instanceof Error ? error.message : String(error));
        }
    }
    return results;
}

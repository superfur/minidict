import * as path from 'path';
// import * as debug from '../utils/debug';
import plugins from '../utils/plugins';
import { MDOutput, MDError } from '../types';

interface PluginResult {
    pluginName: string;
    translation: string;
    error: {
        code: number;
        message: string;
    };
}

/**
 * 检查是否使用所有可用插件
 */
function useAllPlugins(types: Record<string, boolean>): boolean {
    if (!types || Object.keys(types).length === 0) return true;
    const enabledCount = Object.values(types).filter(Boolean).length;
    return enabledCount === 0 || enabledCount === Object.keys(types).length;
}

/**
 * 搜索翻译结果
 * @param words 要翻译的文本
 * @param types 启用的翻译插件类型
 */
export async function search(words: string, types: Record<string, boolean>): Promise<MDOutput[]> {
    if (!plugins || plugins.length === 0) {
        throw new Error('没有启用任何翻译插件，请检查配置');
    }

    const isAll = useAllPlugins(types);
    
    try {
        const pluginList = plugins
            .filter((p: string) => {
                const pluginName = p.split('-')[1];
                return isAll || types[pluginName];
            })
            .map(async (plugin: string) => {
                try {
                    const pluginPath = path.join(__dirname, '../plugins/', plugin);
                    const translator = require(pluginPath);
                    return await translator(words);
                } catch (err) {
                    return {
                        pluginName: plugin,
                        translation: '',
                        error: {
                            code: 500,
                            message: err instanceof Error ? err.message : '插件执行失败'
                        }
                    };
                }
            });

        const results = await Promise.all(pluginList);
        return results.filter((result: MDOutput | MDError): result is MDOutput => {
            if ('code' in result) {
                console.warn(`插件执行出错: ${result.message}`);
                return false;
            }
            return true;
        });
    } catch (err) {
        throw new Error(`翻译服务执行失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
};


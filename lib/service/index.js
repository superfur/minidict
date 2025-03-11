"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
const path = __importStar(require("path"));
const plugins_1 = __importDefault(require("../utils/plugins"));
/**
 * 检查是否使用所有可用插件
 */
function useAllPlugins(types) {
    if (!types || Object.keys(types).length === 0)
        return true;
    const enabledCount = Object.values(types).filter(Boolean).length;
    return enabledCount === 0 || enabledCount === Object.keys(types).length;
}
/**
 * 搜索翻译结果
 * @param words 要翻译的文本
 * @param types 启用的翻译插件类型
 */
async function search(words, types) {
    if (!plugins_1.default || plugins_1.default.length === 0) {
        throw new Error('没有启用任何翻译插件，请检查配置');
    }
    const isAll = useAllPlugins(types);
    try {
        const pluginList = plugins_1.default
            .filter((p) => {
            const pluginName = p.split('-')[1];
            return isAll || types[pluginName];
        })
            .map(async (plugin) => {
            try {
                const pluginPath = path.join(__dirname, '../plugins/', plugin);
                const translator = require(pluginPath);
                return await translator(words);
            }
            catch (err) {
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
        return results.filter((result) => {
            if ('code' in result) {
                console.warn(`插件执行出错: ${result.message}`);
                return false;
            }
            return true;
        });
    }
    catch (err) {
        throw new Error(`翻译服务执行失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
}
;

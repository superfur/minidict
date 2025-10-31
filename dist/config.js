import fs from 'fs/promises';
import path from 'path';
import os from 'os';
const defaultConfig = {
    plugins: ['bing', 'youdao'],
    showPhonetic: true,
    showExamples: false,
    maxExamples: 3
};
export async function loadConfig(configPath) {
    try {
        const homeConfigPath = path.join(os.homedir(), '.minidict.json');
        const filePath = configPath || homeConfigPath;
        const content = await fs.readFile(filePath, 'utf-8');
        const userConfig = JSON.parse(content);
        // 合并用户配置和默认配置
        const config = {
            plugins: Array.isArray(userConfig.plugins) ? userConfig.plugins : defaultConfig.plugins,
            showPhonetic: typeof userConfig.showPhonetic === 'boolean' ? userConfig.showPhonetic : defaultConfig.showPhonetic,
            showExamples: typeof userConfig.showExamples === 'boolean' ? userConfig.showExamples : defaultConfig.showExamples,
            maxExamples: typeof userConfig.maxExamples === 'number' ? userConfig.maxExamples : defaultConfig.maxExamples
        };
        return config;
    }
    catch (error) {
        // 如果配置文件不存在或读取失败，返回默认配置
        return defaultConfig;
    }
}

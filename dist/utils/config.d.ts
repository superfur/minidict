import type { Config } from '../types.js';
declare const config: Record<string, string[]>;
interface CommandOptions {
    bing?: boolean;
    youdao?: boolean;
}
export declare function getConfig(options: CommandOptions): Promise<Config>;
export declare const updateConfig: (newConfig: Partial<Config>) => void;
export default config;

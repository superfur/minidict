import type { Config } from '../types';
declare const config: Record<string, string[]>;
export declare const getConfig: () => Config;
export declare const updateConfig: (newConfig: Partial<Config>) => void;
export default config;

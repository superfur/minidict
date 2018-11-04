import fetch from 'node-fetch';
import { MDOutput, MDError } from '../../types';
import { parse } from './lib/parser';

async function main(words: string): Promise<MDOutput> {
    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(words)}`;
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        const output = parse(html);
        
        if ('code' in output) {
            throw new Error(output.message);
        }
        
        output.pluginName = 'Bing';
        output.words = words;
        output.url = url;
        
        return output;
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : '未知错误');
    }
}

export = main;

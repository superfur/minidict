import fetch from './lib/fetch';
import parser from './lib/parser';
import { MDOutput } from '../output';

async function main(words): Promise<MDOutput> {
    if (!words) Promise.reject(new Error('请输入要查询的文字'));

    const keywords = encodeURIComponent(words);
    const url = `https://cn.bing.com/dict/search?q=${keywords}`;
    return fetch(url)
        .then(body => parser(body))
        .catch(err => {
            console.error(err);
        })
        .then(output => {
            output.pluginName = 'Bing';
            output.words = words;
            output.url = url;
            return output;
        });
};

module.exports = main;

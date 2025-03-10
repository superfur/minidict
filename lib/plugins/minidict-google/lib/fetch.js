'use strict';
const fetch = require('node-fetch');
const headers = new fetch.Headers({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Host': 'cn.bing.com',
    'Pragma': 'no-cache',
    'Referer': 'http://cn.bing.com/dict/?FORM=Z9LH3',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
});
function main(url) {
    const fetchOptions = {
        headers,
        timeout: 5000,
    };
    return fetch(url, fetchOptions).then(res => res.text());
}
module.exports = main;
//# sourceMappingURL=fetch.js.map
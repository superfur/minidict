import * as fetch from 'node-fetch';


const headers = new fetch.Headers({
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Language': 'zh-CN,zh;q=0.8',
  'Cache-Control': 'max-age=0',
  Connection: 'keep-alive',
  Host: 'www.youdao.com',
  Referer: 'http://www.youdao.com/?cookie=new',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
});

export default function main(url: string) {

  const fetchOptions = {
    headers,
    timeout: 5000,
  };

  return fetch(url, fetchOptions).then(res => res.text())
}


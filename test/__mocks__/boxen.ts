// boxen v8 是纯 ESM，jest 直接加载会失败。测试只校验卡片内的文本内容，
// 这里用一个轻量桩：把标题与正文拼接返回，保留断言所需的可见文本。
interface BoxenOptions {
  title?: string;
  [key: string]: unknown;
}

const boxen = (content: string, options: BoxenOptions = {}): string => {
  const title = options.title ? `${options.title}\n` : '';
  return `${title}${content}`;
};

export default boxen;

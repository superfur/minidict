// string-width 是纯 ESM，jest 直接加载会失败。测试中只需一个近似宽度即可，
// 这里按「CJK/全角字符计 2，其余计 1」粗略估算，并剥离 ANSI 颜色码。
const stringWidth = (input: string): number => {
  // eslint-disable-next-line no-control-regex
  const clean = String(input).replace(/\x1B\[[0-9;]*m/g, '');
  let width = 0;
  for (const ch of clean) {
    width += (ch.codePointAt(0) || 0) > 0x1100 ? 2 : 1;
  }
  return width;
};

export default stringWidth;

import { createRequire } from 'module';

const modRequire = createRequire(import.meta.url);
// 单一真相源：版本号始终取自 package.json，避免与之漂移。
const pkg = modRequire('../package.json') as { version: string };

export const version: string = pkg.version;

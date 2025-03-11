import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const debug = require('debug')('minidict');
export default debug;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = version;
const pkg = require('../package.json');
/**
 * 获取 MiniDict 版本信息
 */
function version() {
    console.log('--------------------------------');
    console.log(`  主程序 MiniDict: ${pkg.version}`);
    console.log('--------------------------------');
}

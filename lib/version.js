"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
const pkg = require('../package.json');
function version() {
    console.log('--------------------------------');
    console.log(`  主程序 MiniDict: ${pkg.version}`);
    console.log('--------------------------------');
}
exports.version = version;
//# sourceMappingURL=version.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.success = exports.start = void 0;
const ora = require("ora");
const spinner = ora('查询中...');
function start() {
    spinner.start();
}
exports.start = start;
;
function success(message = '') {
    spinner.succeed(message);
}
exports.success = success;
;
function fail() {
    spinner.fail();
}
exports.fail = fail;
;
//# sourceMappingURL=loader.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
exports.success = success;
exports.fail = fail;
const ora_1 = __importDefault(require("ora"));
const spinner = (0, ora_1.default)('查询中...');
function start() {
    spinner.start();
}
;
function success(text) {
    spinner.succeed(text);
}
;
function fail() {
    spinner.fail('查询失败');
}
;

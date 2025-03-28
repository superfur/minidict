"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.getConfig = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const os_1 = require("os");
const debug_1 = __importDefault(require("./debug"));
const CONFIG_FILE = '.minidict.yml';
let userConfig = {};
try {
    const configPath = path.join((0, os_1.homedir)(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        userConfig = yaml.load(content);
    }
}
catch (err) {
    console.error('读取配置文件失败:', err);
}
const config = {
    plugins: []
};
if (userConfig && userConfig.plugins) {
    for (const item in config) {
        const userConfigItem = userConfig[item] || [];
        config[item] = userConfigItem.map((key) => `minidict-${key}`);
    }
}
(0, debug_1.default)('format config: %O', config);
const Conf = require('conf');
const configInstance = new Conf({
    defaults: {
        plugins: ['google', 'bing', 'youdao'],
        showPhonetic: true,
        showExamples: true,
        maxExamples: 3
    }
});
const getConfig = () => {
    return configInstance.store;
};
exports.getConfig = getConfig;
const updateConfig = (newConfig) => {
    Object.entries(newConfig).forEach(([key, value]) => {
        configInstance.set(key, value);
    });
};
exports.updateConfig = updateConfig;
exports.default = config;

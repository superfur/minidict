"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const registry_1 = require("../plugins/core/registry");
const config_1 = require("../utils/config");
const debug_1 = require("../utils/debug");
function useAllPlugins(types) {
    let count = 0;
    for (const key in types) {
        if (types[key])
            count++;
    }
    return count === 0 || count === 3;
}
function search(words, types) {
    return __awaiter(this, void 0, void 0, function* () {
        const enabled = config_1.default.enable;
        if (!enabled || !enabled.length) {
            console.log('没有启用任何插件');
            return [];
        }
        const isAll = useAllPlugins(types);
        const targets = enabled.filter(name => {
            if (isAll)
                return true;
            const key = name.split('-').slice(1).join('-');
            return types[key] === true;
        });
        if (!targets.length) {
            console.log('没有匹配的插件');
            return [];
        }
        debug_1.default('enabled plugins: %O', targets);
        const input = { text: words };
        const results = yield Promise.all(targets.map((name) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const plugin = registry_1.getPlugin(name);
            if (!plugin) {
                debug_1.default('plugin %s not found in registry', name);
                return null;
            }
            const pluginConfig = (_b = (_a = config_1.default.plugins) === null || _a === void 0 ? void 0 : _a[name]) !== null && _b !== void 0 ? _b : {};
            debug_1.default('calling plugin %s with config: %O', name, pluginConfig);
            try {
                return yield plugin.translate(input, pluginConfig);
            }
            catch (err) {
                debug_1.default('plugin %s error: %O', name, err);
                return null;
            }
        })));
        return results.filter(Boolean);
    });
}
exports.search = search;
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const path = require("path");
const plugins_1 = require("../utils/plugins");
function useAllPlugins(types) {
    let count = 0;
    for (let i in types) {
        if (types[i])
            count++;
    }
    return count === 0 || count === 3;
}
function search(words, types) {
    if (plugins_1.default && !plugins_1.default.length) {
        console.log('没有启用任何插件');
        return;
    }
    const isAll = useAllPlugins(types);
    const pluginList = plugins_1.default.filter(p => {
        const pn = p.split('-')[1];
        if (isAll) {
            return true;
        }
        else {
            return types[pn];
        }
    }).map(plugin => {
        const pluginPath = path.join(__dirname, '../plugins/', plugin);
        return require(pluginPath)(words);
    });
    return Promise.all(pluginList).then(data => {
        const successData = [];
        data.forEach(item => {
            successData.push(item);
        });
        return Promise.resolve(successData);
    });
}
exports.search = search;
;
//# sourceMappingURL=index.js.map
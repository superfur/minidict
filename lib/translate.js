"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const service_1 = require("./service");
const template_1 = require("./template");
const loader_1 = require("./template/loader");
function translate(words, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        const sentence = words
            .map(word => word.trim())
            .join(' ')
            .slice(0, 240);
        loader_1.start();
        try {
            const data = yield service_1.search(sentence, type);
            const output = template_1.template(data);
            const endTime = Date.now();
            const duration = moment.duration(endTime - startTime).asSeconds();
            loader_1.success(`Translate "${words}" in ${duration}s:`);
            console.log(output);
        }
        catch (err) {
            loader_1.fail();
            console.error(err);
        }
    });
}
exports.translate = translate;
;
//# sourceMappingURL=translate.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODES = exports.MDError = exports.Translation = exports.Phonetic = void 0;
class Phonetic {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}
exports.Phonetic = Phonetic;
class Translation {
    constructor(type, trans) {
        this.type = type;
        this.trans = trans;
    }
}
exports.Translation = Translation;
class MDError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.type = CODES[this.code] || '';
        this.message = message;
    }
}
exports.MDError = MDError;
var CODES;
(function (CODES) {
    CODES[CODES["SUCCESS"] = 0] = "SUCCESS";
    CODES[CODES["NETWORK_ERROR"] = 1] = "NETWORK_ERROR";
    CODES[CODES["PARSE_ERROR"] = 2] = "PARSE_ERROR";
    CODES[CODES["OTHER"] = 99] = "OTHER";
})(CODES || (exports.CODES = CODES = {}));
//# sourceMappingURL=index.js.map
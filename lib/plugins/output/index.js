"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODES = exports.MDError = exports.PhraseResult = exports.Example = exports.Translate = exports.Phonetic = exports.MDOutput = void 0;
class MDOutput {
    constructor(code = CODES.SUCCESS, message = '') {
        this.pluginName = '';
        this.words = '';
        this.url = '';
        this.phonetics = [];
        this.translates = [];
        this.examples = [];
        this.phrases = [];
        this.from = '';
        this.to = '';
        this.error = new MDError(code, message);
    }
}
exports.MDOutput = MDOutput;
class Phonetic {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}
exports.Phonetic = Phonetic;
class Translate {
    constructor(type, trans) {
        this.type = type;
        this.trans = trans;
    }
}
exports.Translate = Translate;
class Example {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
}
exports.Example = Example;
class PhraseResult {
    constructor(phrase, translates) {
        this.phrase = phrase;
        this.translates = translates;
    }
}
exports.PhraseResult = PhraseResult;
class MDError {
    constructor(code = CODES.SUCCESS, message = '') {
        this.code = code;
        this.type = CODES[code] || '';
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
})(CODES = exports.CODES || (exports.CODES = {}));
//# sourceMappingURL=index.js.map
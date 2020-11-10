/**
 * 输出对象
 *
 * @class MDOutput
 */
export class MDOutput {
    /**
     * 插件显示的名称
     *
     * @type {string}
     * @memberof MDOutput
     */
    pluginName: string;
    /**
     * 查询的单词 & 短语
     *
     * @type {string}
     * @memberof MDOutput
     */
    words: string;
    /**
     * 查询地址
     *
     * @type {string}
     * @memberof MDOutput
     */
    url: string;
    /**
     * 音标对象
     *
     * @type {Phonetic[]}
     * @memberof MDOutput
     */
    phonetics: Phonetic[];
    /**
     * 翻译对象
     *
     * @type {Translate[]}
     * @memberof MDOutput
     */
    translates: Translate[];
    /**
     * 错误信息
     *
     * @type {MDError}
     * @memberof MDOutput
     */
    error: MDError;

    constructor(code, message) {
        this.pluginName = '';
        this.words = '';
        this.url = '';
        this.phonetics = [];
        this.translates = [];

        // 错误信息
        this.error = new MDError(code, message);
    }
}

/**
 * 音标对象
 *
 * @export
 * @class Phonetic
 */
export class Phonetic {
    /**
     * 音标类型，例如 美
     *
     * @type {string}
     * @memberof Phonetic
     */
    type: string;
    /**
     * 音标值，例如 [həˈləʊ]
     *
     * @type {string}
     * @memberof Phonetic
     */
    value: string;
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

/**
 * 翻译对象
 *
 * @export
 * @class Translate
 */
export class Translate {
    /**
     * 词性
     *
     * @type {string}
     * @memberof Translate
     */
    type: string;
    /**
     * 翻译
     *
     * @type {string}
     * @memberof Translate
     */
    trans: string;
    constructor(type, trans) {
        this.type = type;

        this.trans = trans;
    }
}

/**
 * 错误
 *
 * @export
 * @class MDError
 */
export class MDError {
    /**
     * 错误码
     *
     * @type {number}
     * @memberof MDError
     */
    code: number;
    /**
     * 错误类型
     *
     * @type {string}
     * @memberof MDError
     */
    type: string;
    /**
     * 错误输出
     *
     * @type {string}
     * @memberof MDError
     */
    message: string;

    constructor(code = CODES.SUCCESS, message = '') {
        this.code = code;
        this.type = CODES[this.code] || '';
        this.message = message;
    }
}

/**
 * 状态码
 * 枚举
 *
 * @export
 * @enum {number}
 */
export enum CODES {
    SUCCESS,
    NETWORK_ERROR,
    PARSE_ERROR,
    OTHER = 99,
}



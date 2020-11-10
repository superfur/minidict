export declare class MDOutput {
    pluginName: string;
    words: string;
    url: string;
    phonetics: Phonetic[];
    translates: Translate[];
    error: MDError;
    constructor(code: any, message: any);
}
export declare class Phonetic {
    type: string;
    value: string;
    constructor(type: any, value: any);
}
export declare class Translate {
    type: string;
    trans: string;
    constructor(type: any, trans: any);
}
export declare class MDError {
    code: number;
    type: string;
    message: string;
    constructor(code?: CODES, message?: string);
}
export declare enum CODES {
    SUCCESS = 0,
    NETWORK_ERROR = 1,
    PARSE_ERROR = 2,
    OTHER = 99
}

export interface MDOutput {
    pluginName: string;
    words: string;
    url: string;
    phonetics: Phonetic[];
    translations: Translation[];
    error: MDError;
    examples: string[];
}
export declare class Phonetic {
    type: string;
    value: string;
    constructor(type: string, value: string);
}
export declare class Translation {
    type: string;
    trans: string;
    constructor(type: string, trans: string);
}
export declare class MDError extends Error {
    code: number;
    type: string;
    message: string;
    constructor(code: number, message: string);
}
export declare enum CODES {
    SUCCESS = 0,
    NETWORK_ERROR = 1,
    PARSE_ERROR = 2,
    OTHER = 99
}

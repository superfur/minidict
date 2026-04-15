export declare class MDOutput {
    pluginName: string;
    words: string;
    url: string;
    phonetics: Phonetic[];
    translates: Translate[];
    examples: Example[];
    phrases: PhraseResult[];
    from: string;
    to: string;
    error: MDError;
    constructor(code?: CODES, message?: string);
}
export declare class Phonetic {
    type: string;
    value: string;
    constructor(type: string, value: string);
}
export declare class Translate {
    type: string;
    trans: string;
    constructor(type: string, trans: string);
}
export declare class Example {
    from: string;
    to: string;
    constructor(from: string, to: string);
}
export declare class PhraseResult {
    phrase: string;
    translates: Translate[];
    constructor(phrase: string, translates: Translate[]);
}
export declare class MDError {
    code: CODES;
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

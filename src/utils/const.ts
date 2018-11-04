export interface DictionaryType {
    youdao?: boolean;
    bing?: boolean;
    google?: boolean;
}

export const CODES = {
    SUCCESS: 0,
    NETWORK_ERROR: 1,
    PARSE_ERROR: 2,
};
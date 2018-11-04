export = main;
declare function main(words: any): Promise<void | {
    pluginName: string;
    phonetics: any[];
    trans: any[];
} | undefined>;

declare module 'unicons' {
    const content: any;
    export default content;
}

declare module 'string-break' {
    const content: any;
    export default content;
}

declare module 'cli-width' {
    const content: () => number;
    export default content;
}

declare module 'pad' {
    const content: {
        (str: string | number, len: number, char?: string): string;
        left: (str: string | number, len: number, char?: string) => string;
        right: (str: string | number, len: number, char?: string) => string;
    };
    export default content;
} 
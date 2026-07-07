export type ClickDeckDevToolsConfig = {
    storage: typeof import("./adapters/storage").storage;
    language: string;
    assets: {
        logo: string;
        collapsedLogo: string;
    };
};
export declare function initClickDeck(config: ClickDeckDevToolsConfig): void;
export declare function destroyClickDeck(): void;
export declare function toggleClickDeck(): void;
export declare function isClickDeckActive(): boolean;
export declare function setClickDeckLanguage(lang: "en" | "zh"): void;

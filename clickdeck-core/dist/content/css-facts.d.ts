export type CssFactKind = "text" | "media" | "layout" | "positioned" | "overlay" | "unknown";
export type CssFacts = {
    kind: CssFactKind;
    base: string[];
    text: string[];
    media: string[];
    layout: string[];
    positioning: string[];
    hints: string[];
};
export declare function collectCssFacts(element: HTMLElement): CssFacts;

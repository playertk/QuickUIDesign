import type { EditorPatch } from "../state/editor-state";
export type PromptBuildResult = {
    ok: true;
    prompt: string;
    hasMediaReplacement: boolean;
} | {
    ok: false;
    reason: "empty";
    message: string;
};
export type PromptLanguage = "en" | "zh";
export type PromptPageContext = {
    url: string;
    title: string;
};
export type PromptBuildOptions = {
    language: PromptLanguage;
    page: PromptPageContext;
};
export type PromptChangeGroup = {
    key: string;
    target: string;
    targetElement?: HTMLElement;
    locator: string;
    slideContext?: string;
    styleChanges: Map<string, {
        before: string;
        after: string;
    }>;
    textChange?: {
        before: string;
        after: string;
    };
    attributeChanges: Map<string, {
        before: string;
        after: string;
    }>;
    firstSeenAt: number;
};
export declare function groupPromptChanges(patches: EditorPatch[]): PromptChangeGroup[];
export declare function buildAiEditPrompt(patches: EditorPatch[], options: PromptBuildOptions): PromptBuildResult;
export declare function quoteSnippet(value: string): string;
export declare function summarizeTextChange(before: string, after: string, isZh: boolean): string[];
export declare function normalizeAttributeValue(attribute: string, value: string): string;

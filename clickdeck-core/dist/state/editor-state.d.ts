import type { StyleProperty } from "./style-token";
export type ElementLocator = {
    descriptor: string;
    tagName: string;
    roleHint?: string;
    textSnippet?: string;
    imageHint?: string;
    classHint?: string;
    idHint?: string;
    cssPath: string;
    nthOfTypePath: string;
    siblingIndex: number;
    parentDescriptor?: string;
    backgroundImageHint?: string;
    semanticRole?: string;
    semanticAncestor?: string;
    previousSiblingDescriptor?: string;
    nextSiblingDescriptor?: string;
    selectorStability?: "high" | "medium" | "low";
    selectorStabilityReason?: string;
};
export type SelectedElementState = {
    element: Element;
    descriptor: string;
};
export type StylePatch = {
    id: string;
    kind: "style";
    batchId?: string;
    targetElement: Element;
    targetDescriptor: string;
    targetLocator?: ElementLocator;
    property: StyleProperty;
    before: string;
    after: string;
    createdAt: number;
};
export type ContentPatch = {
    id: string;
    kind: "content";
    batchId?: string;
    targetElement: Element;
    targetDescriptor: string;
    targetLocator?: ElementLocator;
    before: string;
    after: string;
    createdAt: number;
};
export type AttributePatch = {
    id: string;
    kind: "attribute";
    batchId?: string;
    targetElement: Element;
    targetDescriptor: string;
    targetLocator?: ElementLocator;
    attribute: "src";
    before: string;
    after: string;
    createdAt: number;
};
export type EditorPatch = StylePatch | ContentPatch | AttributePatch;
export type PersistedPatch = {
    id: string;
    kind: EditorPatch["kind"];
    targetDescriptor: string;
    targetLocator: ElementLocator;
    property?: StyleProperty;
    attribute?: "src";
    before: string;
    after: string;
    createdAt: number;
};
export type PersistedIntentDraft = {
    operation: {
        id: string;
        action: string;
        source: {
            id: string;
            action: string;
            userIntent: string;
            pageMode: string;
            viewportBox: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            documentBox: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            relativeBox?: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            anchor: {
                kind: string;
                label?: string;
                locator?: ElementLocator;
                rect?: {
                    left: number;
                    top: number;
                    width: number;
                    height: number;
                    right: number;
                    bottom: number;
                };
                confidence: string;
            };
            createdAt: number;
            isGhostPreview?: boolean;
        };
        target?: {
            id: string;
            action: string;
            userIntent: string;
            pageMode: string;
            viewportBox: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            documentBox: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            relativeBox?: {
                left: number;
                top: number;
                width: number;
                height: number;
                right: number;
                bottom: number;
            };
            anchor: {
                kind: string;
                label?: string;
                locator?: ElementLocator;
                rect?: {
                    left: number;
                    top: number;
                    width: number;
                    height: number;
                    right: number;
                    bottom: number;
                };
                confidence: string;
            };
            createdAt: number;
            isGhostPreview?: boolean;
        };
        createdAt: number;
    };
    color: string;
};
export type PersistedPageEdits = {
    version: 2;
    href: string;
    patches: PersistedPatch[];
    intentDrafts?: PersistedIntentDraft[];
    savedAt: number;
};
export type EditorState = {
    active: boolean;
    selected: SelectedElementState | null;
    patches: EditorPatch[];
};
export declare function createEditorState(): EditorState;
export declare function setEditorActive(state: EditorState, active: boolean): void;
export declare function setSelectedElement(state: EditorState, selected: SelectedElementState | null): void;
export declare function recordStylePatch(state: EditorState, patch: StylePatch): void;
export declare function recordContentPatch(state: EditorState, patch: ContentPatch): void;
export declare function buildStorageKey(href: string): string;
export declare function serializePatches(patches: EditorPatch[]): PersistedPatch[];
export declare function findElementByLocator(locator: ElementLocator): Element | null;
export declare function hydratePersistedPatches(persisted: PersistedPatch[], logger?: {
    warn: (message: string, details?: unknown) => void;
}): EditorPatch[];

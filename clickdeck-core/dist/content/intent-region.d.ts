import { ElementLocator } from "../state/editor-state";
import { RectLike } from "./visual-units";
export type IntentAction = "intent" | "move" | "remove";
export type PageMode = "slide" | "long" | "unknown";
export declare const ANCHOR_OVERLAP_EPSILON = 10;
export type RegionAnchor = {
    kind: "slide" | "section" | "container" | "document";
    label?: string;
    locator?: ElementLocator;
    rect?: RectLike;
    confidence: "high" | "medium" | "low";
};
export type IntentRegion = {
    id: string;
    action: IntentAction;
    userIntent: string;
    pageMode: PageMode;
    viewportBox: RectLike;
    documentBox: RectLike;
    relativeBox?: RectLike;
    anchor: RegionAnchor;
    createdAt: number;
    isGhostPreview?: boolean;
};
export type IntentOperation = {
    id: string;
    action: IntentAction;
    source: IntentRegion;
    target?: IntentRegion;
    createdAt: number;
};
export declare function normalizeRect(input: Partial<RectLike>): RectLike;
export declare function toDocumentRect(viewportBox: RectLike, scrollX?: number, scrollY?: number): RectLike;
export declare function toRelativeRect(box: RectLike, anchorRect: RectLike): RectLike;
export declare function isVisibleAnchorCandidate(element: HTMLElement): boolean;
export declare function getAnchorPriority(element: HTMLElement): number;
export declare function detectPageMode(root?: ParentNode): PageMode;
export declare function findRegionAnchor(box: RectLike, root?: ParentNode): RegionAnchor;
export declare function createIntentRegion(options: {
    action: IntentAction;
    userIntent: string;
    viewportBox: RectLike;
    root?: ParentNode;
    isGhostPreview?: boolean;
}): IntentRegion;
export declare function createIntentOperation(source: IntentRegion, target?: IntentRegion): IntentOperation;

import { ElementLocator } from "../state/editor-state";
export type VisualUnitKind = "block" | "textBlock" | "textLine" | "image" | "video" | "background" | "interactive";
export type RectLike = {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
};
export type VisualUnit = {
    id: string;
    kind: VisualUnitKind;
    element: HTMLElement;
    locator: ElementLocator;
    rect: RectLike;
    documentRect: RectLike;
    textSnippet?: string;
    roleHint?: string;
    parentUnitId?: string;
    confidence: "high" | "medium" | "low";
};
export type VisualUnitMatch = {
    unit: VisualUnit;
    overlapRatio: number;
    overlapArea: number;
    centerInBox: boolean;
    score: number;
};
export declare function collectVisualUnits(root?: Node): VisualUnit[];
export declare function rectsOverlap(a: RectLike, b: RectLike): boolean;
export declare function calculateOverlap(a: RectLike, b: RectLike): {
    overlapArea: number;
    overlapRatio: number;
};
export declare function isCenterInBox(rect: RectLike, box: RectLike): boolean;
export declare function findVisualUnitsInBox(units: VisualUnit[], box: RectLike): VisualUnitMatch[];

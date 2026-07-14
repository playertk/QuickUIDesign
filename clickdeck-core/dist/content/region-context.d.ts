import { IntentRegion } from "./intent-region";
import { VisualUnit, RectLike } from "./visual-units";
export type RegionCandidate = {
    unit: VisualUnit;
    rank: number;
    reason: string;
    overlapRatio: number;
    centerInBox: boolean;
};
export type NearbyReference = {
    direction: "above" | "below" | "left" | "right";
    unit: VisualUnit;
    distance: number;
    summary: string;
    layoutSemantic?: string;
};
export type AlignmentHint = {
    summary: string;
    deltaPx: number;
    confidence: "high" | "medium" | "low";
};
export type AlignmentEdge = "left" | "right" | "top" | "bottom" | "centerX" | "centerY";
export type GuideCandidate = {
    axis: "x" | "y";
    position: number;
    sourceEdge: AlignmentEdge;
    unitSummary: string;
    unitKind: VisualUnit["kind"];
    sourceRect: RectLike;
};
export type ActiveAlignmentGuide = {
    axis: "x" | "y";
    position: number;
    targetEdge: AlignmentEdge;
    sourceEdge: AlignmentEdge;
    unitSummary: string;
    deltaPx: number;
    confidence: "high";
};
export type RegionContext = {
    region: IntentRegion;
    candidates: RegionCandidate[];
    nearby: NearbyReference[];
    alignmentHints?: AlignmentHint[];
    activeAlignmentGuides?: ActiveAlignmentGuide[];
    empty: boolean;
    confidence: "high" | "medium" | "low";
};
export declare function summarizeVisualUnit(unit: VisualUnit): string;
export declare function rankRegionCandidates(region: IntentRegion, units: VisualUnit[]): RegionCandidate[];
export declare function findNearbyReferences(region: IntentRegion, units: VisualUnit[], options?: RegionContextOptions): NearbyReference[];
export type AlignmentHintOptions = {
    excludeTextSnippets?: string[];
};
export declare function calculateAlignmentHints(box: RectLike, anchorRect: RectLike | undefined, units: VisualUnit[], options?: AlignmentHintOptions): AlignmentHint[];
export type RegionContextOptions = {
    excludeTextSnippets?: string[];
    excludeElements?: HTMLElement[];
    excludeUnitIds?: string[];
    activeAlignmentGuides?: ActiveAlignmentGuide[];
};
export declare function buildRegionContext(region: IntentRegion, units: VisualUnit[], options?: RegionContextOptions): RegionContext;

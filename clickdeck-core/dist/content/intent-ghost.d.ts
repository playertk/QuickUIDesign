import { RectLike } from "./visual-units";
import type { ActiveAlignmentGuide, GuideCandidate } from "./region-context";
export type MoveTargetBox = {
    element: HTMLDivElement;
    destroy: () => void;
};
export type MoveTargetBoxOptions = {
    color: string;
    label: string;
    anchorElement: HTMLElement | null;
    useRelativeBox: boolean;
    box: RectLike;
    guideCandidates: GuideCandidate[];
    onChange: (finalRect: RectLike, activeGuides: ActiveAlignmentGuide[]) => void;
    onCancel: () => void;
};
export declare function computeActiveGuides(rect: RectLike, guideCandidates: GuideCandidate[], threshold?: number): ActiveAlignmentGuide[];
export declare function snapRectToGuides(rect: RectLike, guideCandidates: GuideCandidate[], threshold?: number): {
    rect: RectLike;
    guides: ActiveAlignmentGuide[];
    dx: number;
    dy: number;
};
export declare function createMoveTargetBox(options: MoveTargetBoxOptions): MoveTargetBox;

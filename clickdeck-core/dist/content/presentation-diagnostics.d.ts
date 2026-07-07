export type DiagnosticPageInfo = {
    url: string;
    title: string;
    viewportWidth: number;
    viewportHeight: number;
    scrollX: number;
    scrollY: number;
    isClickDeckPresenting: boolean;
};
export type DiagnosticSlideDetection = {
    count: number;
    mode: string;
    slides: Array<{
        index: number;
        tagName: string;
        id: string;
        className: string;
        textSnippet: string;
    }>;
};
export type DiagnosticHostCapabilities = {
    hasPlaySlideHook: boolean;
    hasClickDeckSyncProtocol: boolean;
    hasRevealSlide: boolean;
    hasRevealSync: boolean;
    hasRevealLayout: boolean;
    hasImpress: boolean;
    hasNavDots: boolean;
    navDotCount: number;
    hasCurrentSlideCounter: boolean;
    hasTotalSlidesCounter: boolean;
};
export type DiagnosticSlideInfo = {
    tagName: string;
    id: string;
    className: string;
    textSnippet: string;
    computed: {
        display: string;
        visibility: string;
        opacity: string;
        transform: string;
        position: string;
        zIndex: string;
        pointerEvents: string;
    };
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    isInViewport: boolean;
    hasNonZeroRect: boolean;
    isProbablyVisible: boolean;
    hiddenReasons: string[];
};
export type DiagnosticSnapshot = {
    capturedAt: string;
    presentingSlideIndex: number | null;
    activeSlideIndexes: number[];
    prevSlideIndexes: number[];
    hiddenByClickDeckIndexes: number[];
    navActiveIndexes: number[];
    currentSlideCounterText: string | null;
    totalSlidesCounterText: string | null;
    currentSlide: DiagnosticSlideInfo | null;
    contentCandidates: DiagnosticSlideInfo[];
};
export type PresentationDiagnosticReport = {
    createdAt: string;
    page: DiagnosticPageInfo;
    slideDetection: DiagnosticSlideDetection;
    hostCapabilities: DiagnosticHostCapabilities;
    snapshots: DiagnosticSnapshot[];
};
export declare function collectPresentationDiagnostics(options?: {
    maxTextLength?: number;
    maxContentCandidates?: number;
}): PresentationDiagnosticReport;

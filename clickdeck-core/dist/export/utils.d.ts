import type { ClickDeckLogger } from "../diagnostics/logger";
export type ScrollTarget = {
    element: Window | HTMLElement;
    getScrollTop: () => number;
    setScrollTop: (value: number) => void;
    getScrollHeight: () => number;
    getClientHeight: () => number;
    getClientWidth: () => number;
    restore: () => void;
};
export declare function wait(ms: number): Promise<void>;
export declare function waitForVisualStability(baseWaitMs?: number): Promise<void>;
export declare function waitForExportReadiness(baseWaitMs?: number): Promise<void>;
export declare function loadImage(src: string): Promise<HTMLImageElement>;
export declare function detectScrollTarget(): ScrollTarget;
export declare function throttledCaptureViewport(logger: ClickDeckLogger): Promise<HTMLImageElement>;

import type { ClickDeckLogger } from "../diagnostics/logger";
export declare function detectPresentationSlides(root?: ParentNode): HTMLElement[];
export type PresentationDirection = "next" | "previous" | "jump" | "initial";
export type PresentationSyncDetail = {
    index: number;
    total: number;
    slide: HTMLElement | null;
    direction: PresentationDirection;
};
type RevealLike = {
    slide?: (index: number) => unknown;
    sync?: () => unknown;
    layout?: () => unknown;
};
type ImpressLike = {
    goto?: (target: string | HTMLElement) => unknown;
};
declare global {
    interface Window {
        __playSlide?: (slideIndex: number) => unknown;
        __clickdeckSyncPresentationState?: (detail: PresentationSyncDetail) => unknown;
        Reveal?: RevealLike;
        impress?: () => ImpressLike;
    }
}
export declare function syncPresentationHostState(options: {
    slides: HTMLElement[];
    index: number;
    direction: PresentationDirection;
    logger: ClickDeckLogger;
}): PresentationSyncDetail;
export type PresentationController = {
    enter: () => Promise<void>;
    exit: () => void;
    next: () => void;
    previous: () => void;
    goTo: (index: number) => void;
    destroy: () => void;
};
export declare function createPresentationController(options: {
    slides: HTMLElement[];
    logger: ClickDeckLogger;
}): PresentationController;
export {};

export type ClickDeckOverlay = {
    root: HTMLDivElement;
    outline: HTMLDivElement;
    destroy: () => void;
    updateOutline: (target: HTMLElement | null) => void;
};
export declare function createOverlay(rootId: string): ClickDeckOverlay;

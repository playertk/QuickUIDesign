export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
};
export type IntentOverlay = {
    root: HTMLDivElement;
    destroy: () => void;
};
export declare function createIntentOverlay(rootId: string, onComplete: (rect: Rect) => void, onCancel: () => void, hintText: string): IntentOverlay;

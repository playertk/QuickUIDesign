export type TabDirection = "forward" | "backward";
export type EditableTargetResolutionSource = "none" | "direct" | "large-container-fallback" | "background-block";
export type EditableTargetResolution = {
    target: HTMLElement | null;
    source: EditableTargetResolutionSource;
};
export declare function isSelectableElement(element: HTMLElement): boolean;
export declare function getTabSwitchTarget(current: HTMLElement, direction: TabDirection): HTMLElement | null;
export declare function isLargeContainer(element: HTMLElement): boolean;
export declare function getEditableTarget(target: EventTarget | null, currentSelected?: HTMLElement | null): HTMLElement | null;
export declare function resolveEditableTarget(target: EventTarget | null, currentSelected?: HTMLElement | null): EditableTargetResolution;

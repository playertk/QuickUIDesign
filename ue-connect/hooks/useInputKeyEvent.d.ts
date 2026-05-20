import { KeyAction } from "../type";
export interface UseInputKeyEventOptions {
    eventName?: string;
    onKeyAction?: (action: KeyAction) => void;
    enableKeyTracking?: boolean;
    enabled?: boolean;
}
export interface UseInputKeyEventReturn {
    lastKeyAction: KeyAction | null;
    pressedKeys: Set<string>;
    isKeyPressed: (key: string) => boolean;
    sendKeyEvent: (action: string, key: string, keyCode?: number) => void;
}
export declare function useInputKeyEvent(options?: UseInputKeyEventOptions): UseInputKeyEventReturn;

import { KeyAction } from "../type";
export interface UseInputKeyEventListenerOptions {
    onKeyAction?: (action: KeyAction) => void;
}
export declare function useInputKeyEventListener(options?: UseInputKeyEventListenerOptions): {
    lastKeyAction: KeyAction | null;
};

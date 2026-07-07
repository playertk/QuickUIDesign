import type { EditorPatch } from "./state/editor-state";
import type { ClickDeckLogger } from "./diagnostics/logger";
export declare function createReactCompatLayer(getPatches: () => EditorPatch[], logger: ClickDeckLogger): {
    destroy: () => void;
};

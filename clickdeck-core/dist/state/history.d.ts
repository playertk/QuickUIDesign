import type { EditorPatch } from "./editor-state";
export type EditHistory = {
    undoStack: EditorPatch[];
    redoStack: EditorPatch[];
};
export declare function createEditHistory(): EditHistory;

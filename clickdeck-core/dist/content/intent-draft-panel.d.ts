import type { PanelLayout } from "./panel";
import type { IntentOperation, IntentAction } from "./intent-region";
export type IntentDraftPanel = {
    element: HTMLDivElement;
    destroy: () => void;
    addDraft: (operation: IntentOperation, color?: string, preSaved?: boolean) => void;
    hide: () => void;
    show: () => void;
    setAnchorLayout: (layout: PanelLayout) => void;
};
export declare function createIntentDraftPanel(onSave: (operation: IntentOperation) => void, onCancel: (operationId: string) => void, onDelete: (operationId: string) => void, onHighlight: (operation: IntentOperation) => void, _onDrawTarget?: (operationId: string) => void, onDragTarget?: (operationId: string) => void, onActionChange?: (operationId: string, action: IntentAction) => void): IntentDraftPanel;

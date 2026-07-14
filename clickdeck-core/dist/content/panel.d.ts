import type { StyleAction } from "./style-actions";
import type { SvgTextEditorItem } from "./complex-elements";
export type PanelAction = StyleAction | "undo" | "redo" | "close" | "copy-diagnostics" | "copy-ai-prompt" | "export-html" | "export-image-pdf-long" | "export-image-pdf-a4" | "export-image-pdf-slides" | "present" | "export-long-image" | "replace-image" | "replace-video" | "add-intent" | "switch-language" | "ask-gemini-flow" | "ask-gemini-focus" | "ask-gemini-interaction" | "edit-svg-text" | `color:${string}`;
export type PromptPreviewOptions = {
    promptEn: string;
    promptZh: string;
    hasMediaReplacement: boolean;
    onCopy: (value: string, lang: "en" | "zh") => void;
};
export type SelectionContext = "none" | "text" | "image" | "video" | "container" | "svg" | "canvas" | "formula" | "iframe";
export type SavedEditsNoticeOptions = {
    count: number;
    hasIntentDrafts?: boolean;
    onRestore: () => void;
    onClear: () => void;
};
export type SvgTextEditorPanelState = {
    mode: string;
    message: string;
};
export type SvgTextEditorOptions = {
    items: {
        id: string;
        label: string;
        value: string;
    }[];
    warning: string;
    onApply: (updates: SvgTextEditorItem[]) => void;
};
export type ClickDeckPanel = {
    element: HTMLDivElement;
    destroy: () => void;
    syncLayout: () => void;
    setHint: (text: string) => void;
    setHistoryAvailability: (canUndo: boolean, canRedo: boolean) => void;
    setReplaceMediaAvailability: (enabled: boolean, mediaType: "image" | "video" | "none") => void;
    setSelectionContext: (context: SelectionContext) => void;
    setSvgTextEditorState: (state: SvgTextEditorPanelState | null) => void;
    setPresentationAvailability: (hasSlides: boolean) => void;
    showSvgTextEditor: (options: SvgTextEditorOptions) => void;
    showPromptPreview: (options: PromptPreviewOptions) => void;
    showSavedEditsNotice: (options: SavedEditsNoticeOptions) => void;
    hideSavedEditsNotice: () => void;
};
export type PanelLayout = {
    left: number;
    top: number;
    width: number;
    height: number;
    collapsed: boolean;
};
export type PanelOptions = {
    onCollapsedChange?: (collapsed: boolean) => void;
    onLayoutChange?: (layout: PanelLayout) => void;
};
export declare function createPanel(onAction: (action: PanelAction) => void, options?: PanelOptions): ClickDeckPanel;

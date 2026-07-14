export type ComplexElementKind = "svg" | "canvas" | "formula" | "iframe";
export type ComplexElementInfo = {
    kind: ComplexElementKind;
    label: string;
    promptLabel: string;
};
export type SvgTextEditorItem = {
    id: string;
    value: string;
};
export type EditableSvgTextItem = {
    id: string;
    label: string;
    value: string;
    target: SVGTextElement | SVGTSpanElement;
};
export type SvgTextEditState = {
    mode: "editable";
    items: EditableSvgTextItem[];
} | {
    mode: "none";
} | {
    mode: "complex";
};
export declare function getComplexElementKind(element: Element | null | undefined): ComplexElementKind | null;
export declare function getComplexElementInfo(element: Element | null | undefined): ComplexElementInfo | null;
export declare function findComplexElementFromTarget(target: EventTarget | null): Element | null;
export declare function isFormulaElement(element: Element): boolean;
export declare function isInsideClickDeckUi(element: Element): boolean;
export declare function getComplexElementPromptNotes(element: Element, isZh: boolean): string[];
export declare function getEditableSvgTextTarget(target: EventTarget | null): SVGTextElement | SVGTSpanElement | null;
export declare function getSvgTextEditState(element: Element | null | undefined): SvgTextEditState | null;

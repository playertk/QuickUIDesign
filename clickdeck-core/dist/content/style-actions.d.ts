import type { ClickDeckLogger } from "../diagnostics/logger";
import type { StyleProperty } from "../state/style-token";
export type StyleAction = "font-smaller" | "font-larger" | "align-left" | "align-center" | "align-right" | "pick-bg-color" | "reset-color" | "weight-decrease" | "weight-increase" | "lineheight-decrease" | "lineheight-increase" | "letterspacing-decrease" | "letterspacing-increase" | "margin-decrease" | "margin-increase" | "padding-decrease" | "padding-increase" | "bg-warm" | "bg-white" | "bg-transparent" | "bg-reset" | "radius-decrease" | "radius-increase" | "image-width-smaller" | "image-width-larger" | "image-maxwidth-100" | "image-fit-contain" | "image-fit-cover" | "image-radius-none" | "image-radius-sm" | "image-radius-lg" | "image-radius-round" | `bg-custom:${string}`;
export type AppliedStyleChange = {
    property: StyleProperty;
    before: string;
    after: string;
};
export declare function applyStyleAction(logger: ClickDeckLogger, element: Element & {
    style: CSSStyleDeclaration;
}, action: StyleAction): AppliedStyleChange[] | null;

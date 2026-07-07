import { type ClickDeckLogger } from "../diagnostics/logger";
export type ClickDeckController = {
    toggle: () => void;
    isActive: () => boolean;
    setLanguage: (lang: "en" | "zh") => void;
};
export declare function createController(logger: ClickDeckLogger, rootId: string): ClickDeckController;

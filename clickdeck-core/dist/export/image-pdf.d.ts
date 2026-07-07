import type { ClickDeckLogger } from "../diagnostics/logger";
declare global {
    interface Window {
        __MOCK_CAPTURE_VISIBLE_TAB?: boolean;
    }
}
export declare function exportImagePdfLongSnapshot(logger: ClickDeckLogger): Promise<void>;
export declare function exportImagePdfA4Snapshot(logger: ClickDeckLogger): Promise<void>;
export declare function exportImagePdfSlidesSnapshot(logger: ClickDeckLogger): Promise<void>;

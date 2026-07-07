export declare class SimpleImagePdf {
    private pages;
    addPage(width: number, height: number): number;
    addJpegImage(pageIndex: number, dataUrl: string, options: {
        pixelWidth: number;
        pixelHeight: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }): void;
    toBlob(): Blob;
}
export declare function imageElementToJpegDataUrl(img: HTMLImageElement, quality?: number): {
    dataUrl: string;
    pixelWidth: number;
    pixelHeight: number;
};
export declare function downloadPdfBlob(blob: Blob, filename: string): void;

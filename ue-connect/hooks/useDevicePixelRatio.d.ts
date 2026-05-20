/**
 * 用于获取设备像素比（Device Pixel Ratio）的挂钩。
 * @returns 包含当前设备像素比（ratio）、将逻辑坐标转换为物理坐标的函数（toPhysical）、将物理坐标转换为逻辑坐标的函数（toLogical）的对象。
 */
export declare function useDPR(): {
    ratio: number;
    toPhysical: (value: number) => number;
    toLogical: (value: number) => number;
};

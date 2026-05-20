/**
 * useUE4Mouse 是一个 UEConnect 上下文提供者组件，用于在应用程序中提供 UE4 上下文。
 * @param defaultUseMouse - 表示是否默认启用鼠标事件。
 * @returns useMouse - 表示是否启用鼠标事件。
 * @returns setUseMouse - 用于设置是否启用鼠标事件的函数。
 *
 * 增强功能：自动检测鼠标是否悬停在带有 data-nohit 属性的元素上，如果检测到则禁用鼠标事件。
 * 使用方式：在需要禁用鼠标事件的元素上添加 data-nohit 属性，如 <div data-nohit></div>
 */
export declare function useUEMouse(defaultUseMouse?: boolean): {
    useMouse: boolean;
    setUseMouse: import("react").Dispatch<import("react").SetStateAction<boolean>>;
};

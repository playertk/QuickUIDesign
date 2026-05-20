/**
 * Hook: 全局输入拦截器
 * - 禁用右键菜单 (contextmenu)
 * - 屏蔽 Tab 键默认行为
 * - 可选参数控制是否启用
 */
export declare function useInputBlocker(options?: {
    disableContextMenu?: boolean;
    disableTabKey?: boolean;
}): void;

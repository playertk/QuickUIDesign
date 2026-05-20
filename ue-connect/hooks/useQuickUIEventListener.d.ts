import { QuickEvent } from "../type";
/**
 * useQuickUIEventListener
 * 在 React 组件中监听来自 UE 的事件（Blueprint 通过 ExecuteJs 调用 window[fnName])
 * @param fnName 事件名（对应 Blueprint / UMG 事件名）
 * @param handler 事件处理函数
 */
export declare function useQuickUIEventListener(fnName: string, handler: (evt: QuickEvent) => void): void;

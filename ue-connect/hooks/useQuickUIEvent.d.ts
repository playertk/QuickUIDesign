import { type QuickEventPayload } from "../type";
/**
 * useQuickUIEvent
 * 发送事件到 UE（fire-and-forget）
 * @param fnName 事件名（对应 Blueprint / UMG 事件名）
 */
export declare function useQuickUIEventSender(fnName: string): (payload?: QuickEventPayload) => void;

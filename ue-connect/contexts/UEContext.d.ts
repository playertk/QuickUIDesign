import React from "react";
import { UEContextType } from "../type";
export declare const UEProvider: React.FC<{
    children: React.ReactNode;
}>;
/**
 * useUEContext 是一个 UEConnect 上下文提供者组件，用于在应用程序中提供 UE 上下文。
 * @returns isConnected 表示是否已连接到 UE 窗口。
 * @returns isMobile - 表示是否为移动设备。
 * @returns useMouse - 表示是否启用鼠标事件。
 * @returns setUseMouse - 用于设置是否启用鼠标事件的函数。
 * @returns lastKeyAction - 最近一次按键操作，来自 UE 的输入事件。
 */
export declare function useUEContext(): UEContextType;

/**
 * 图形设置数据接口
 */
export interface UEGraphicsSettings {
    resolution: string;
    windowMode: number;
    antiAliasing: number;
    shadows: number;
    resolutionScale: number;
}
/**
 * UE4游戏控制Hook
 * 封装UE4引擎的游戏控制相关功能
 */
export declare const useUEGameControl: () => {
    quitGame: () => void;
    clientTravel: (mapOrAddress: string) => void;
    consoleCommand: (command: string) => void;
    setGraphics: (resolution: string, windowMode: number, antiAliasing: number, shadows: number, resolutionScale: number, apply?: boolean) => void;
    applyAndSaveGraphics: () => void;
    getGraphicsSettings: () => void;
    graphicsSettings: UEGraphicsSettings;
    isGraphicsLoading: boolean;
    resolution: string;
    windowMode: number;
    antiAliasing: number;
    shadows: number;
    resolutionScale: number;
};
export default useUEGameControl;
/**
 * 使用案例
 */

export type KeyAction = "Up" | "Down" | "Left" | "Right" | "Next" | "Previous" | "Select";
export interface UEContextType {
    isConnected: boolean;
    isMobile: boolean;
    useMouse: boolean;
    setUseMouse: (useMouse: boolean) => void;
    lastKeyAction: KeyAction | null;
}
export interface UECom {
    jsmouseposition: (x: number, y: number) => void;
    jsmousedown: (x: number, y: number, button: number) => void;
    jsmousewheel: (deltaY: number) => void;
    jsmouseup: (x: number, y: number, button: number) => void;
    emitjsonevent: (functionName: string, json: string) => void;
}
export interface UEWindow extends Window {
    ue?: {
        uecommand: UECom;
    };
}
export type QuickEventPayload = Record<string, any> | null;
export interface QuickEvent<Payload = QuickEventPayload> {
    type: "event";
    topic: string;
    payload?: Payload;
    timestamp: number;
    source: "web" | "ue";
}

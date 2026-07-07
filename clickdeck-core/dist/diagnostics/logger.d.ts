export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = "extension" | "selection" | "style" | "export" | "diagnostics" | "clickdeck-devtools";
export type LogEntry = {
    id: string;
    level: LogLevel;
    context: LogContext;
    message: string;
    details?: unknown;
    createdAt: number;
};
export declare function getRecentLogs(): LogEntry[];
export declare function clearLogs(): void;
export type ClickDeckLogger = {
    debug: (message: string, details?: unknown) => void;
    info: (message: string, details?: unknown) => void;
    warn: (message: string, details?: unknown) => void;
    error: (message: string, details?: unknown) => void;
};
export declare function createLogger(context: LogContext): ClickDeckLogger;

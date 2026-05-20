interface JsonArrayProps {
    [key: string]: any[];
}
interface JsonProps {
    [key: string]: any;
}
/**
 * 优化的useUECallback - 只在后端真正发送新数据时触发
 * @param functionName 回调函数名称
 * @param onData 数据处理回调
 */
export declare function useUECallback<T extends JsonArrayProps | JsonProps>(functionName: string, onData: (data: T) => void): void;
export {};

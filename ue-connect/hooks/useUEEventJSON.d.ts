export interface UseUEEventJSONOptions {
    functionName: string;
}
/**
 *  用于触发带有空参数的UE5事件的挂钩。
 * @param functionName 要触发的UE5函数的名称。必须是UE5蓝图中注册的事件名称.
 * @param { data: {name: 'test', eage: 18} } 以Json形式的附加参数,可以多个，或者嵌套生层次结构。
 * @returns
 */
export declare const useUEEventJSON: ({ functionName }: UseUEEventJSONOptions) => (data: unknown) => void;

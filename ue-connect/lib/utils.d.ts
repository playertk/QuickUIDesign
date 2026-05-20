/**
 * 安全移除JSON字符串中的转义反斜杠
 * @param jsonString 需要处理的JSON字符串
 * @returns 移除转义反斜杠后的干净字符串
 */
export declare function JSONParser(jsonString: string): string;
export declare function safeStringify(obj: any): string;
export declare function tryParse(raw: any): any;
/**
 * 通用筛选函数，用于处理 UE回调的的Json序列，支持过滤和筛选属性
 * @param data - 待处理的 ue_data
 * @param filters - 筛选条件对象，键为属性名，值为筛选值或筛选函数
 * @returns 筛选后的数据
 */
export declare function filterUECallBackJSonData<T extends Record<string, any>>(data: T | undefined, filters: Record<string, any>): Partial<T> | undefined;


export type TabcFunctionReturn = string | string[];
export type TabcFunction = (input: string) => Promise<TabcFunctionReturn> | TabcFunctionReturn;

export interface TabcArg {
    key: string;
    fun: TabcFunction;
    keep: number;
    completionsAreFiles?: boolean;
}

export type TabcFunctionReturn = string[];
export type TabcFunction = () => Promise<TabcFunctionReturn> | TabcFunctionReturn;

export type TabcArg
    = { kind: 'completionsAreFiles' }
    | {
        kind: 'function'
        key: string;
        fun: TabcFunction;
    }


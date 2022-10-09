import { Arg } from "./Arg";


export interface Option<TName, TOption> {
    name: TName; arg: Arg<TOption>; usage?: string; alias?: string;
}

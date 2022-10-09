import { parse } from 'path';
import { argv } from "process";

export function exeName() {
    return parse(argv[1]).name;
}

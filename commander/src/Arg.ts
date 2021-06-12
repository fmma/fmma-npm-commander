import { existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

export class Arg<A> {

    constructor(
        readonly parseToken: (args: string[]) => [any, number] | undefined
    ) { }

    get displayName(): string | undefined {
        let result = this._display;
        if (result == null)
            return undefined;

        if (this._optional) {
            if (result.startsWith('(') && result.endsWith(')'))
                result = result.slice(1, result.length - 1);
            result = `[${result}]`;
        }

        if (this._many)
            result = `${result}...`;

        return result;
    }
    _keywords?: string[];
    _display?: string;
    _many = false;
    _optional = false;
    _completionsAreFiles = false;
    _completions?: (input: string) => string | string[] | Promise<string | string[]>;

    parse(args: string[]): [A, number] | undefined {
        if (this._many) {
            const result: [any, number] = [[], 0];
            while (true) {
                const r = this.parseToken(args.slice(result[1]));
                if (r == null)
                    break;
                result[0].push(r[0]);
                result[1] += r[1];
            }
            return !this._optional && result[0].length === 0 ? undefined : result;
        }
        else {
            const r = this.parseToken(args);
            return this._optional && r == null ? [undefined, 0] : r;
        }
    }

    many(nonEmpty = false): Arg<A[]> {
        this._many = true;
        this._optional = !nonEmpty;
        return this as any;
    }

    optional(): Arg<A | undefined> {
        this._optional = true;
        return this as any;
    }

    display(displayName: string) {
        this._display = displayName;
        return this;
    }

    completionsAreFiles(value?: boolean) {
        this._completionsAreFiles = value ?? true;
        return this;
    }

    completions(completions: (input: string) => string | string[] | Promise<string | string[]>) {
        this._completions = completions;
        return this;
    }
}


export function empty(): Arg<boolean> {
    const arg = new Arg<boolean>(_ => {
        return [true, 0]
    });
    return arg;
}

export function number(displayName?: string): Arg<number> {
    const arg = new Arg<number>(args => {
        const n = parseFloat(args[0]);
        if (isNaN(n))
            return undefined;
        return [n, 1];
    });
    arg._display = displayName ?? 'NUMBER';
    return arg;
}

export function string(displayName?: string): Arg<string> {
    const arg = new Arg<string>(args => {
        const n = args[0];
        if (n == null)
            return undefined;
        return [n, 1];
    });
    arg._display = displayName ?? 'STRING';
    return arg;
}

export function filepath(displayName?: string): Arg<string> {
    const arg = new Arg<string>(args => {
        const n = args[0];
        if (n == null)
            return undefined;
        return [n, 1];
    });
    arg._display = displayName ?? 'FILE';
    arg._completionsAreFiles = true;
    arg._completions = input => {
        const path = `${input}`;
        const pathToSearch = existsSync(path) ? path : dirname(path);
        const result = readdirSync(pathToSearch).map(file => join(pathToSearch, file));
        return result;
    }
    return arg;
}

export function arg(options: {
    displayName?: string,
    completions?: (input: string) => string | string[] | Promise<string | string[]>
}): Arg<string> {
    const arg = new Arg<string>(args => {
        const n = args[0];
        if (n == null)
            return undefined;
        return [n, 1];
    });
    arg._display = options.displayName ?? 'ARG';
    arg._completions = options.completions
    return arg;

}

export function keyword<T extends string>(...keywords: T[]): Arg<T> {
    const arg = new Arg<T>(args => {
        const n = args[0];
        if (n == null)
            return undefined;
        if (!keywords.includes(n as T))
            return undefined;
        return [n as T, 1];
    });
    arg._keywords = keywords;
    arg._display = `(${keywords.join('|')})`;
    return arg;
}

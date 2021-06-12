import { writeFileSync } from 'fs';
import { parse } from 'path';
import { argv, cwd } from "process";
import { Arg, empty } from "./Arg";
import { generateClinkTabCompletionScript } from './clink-codegen';
import { fsCache } from './fs-cache';

export interface Option<TName, TOption> {
    name: TName, arg: Arg<TOption>, usage?: string, alias?: string
}

function exeName() {
    return parse(argv[1]).name;
}

export class Command<TOptions extends object, TRun> {

    name?: string;
    help?: string;
    version?: string;
    subCmds: Command<any, any>[] = [];
    parentCmd?: Command<any, any>;
    options: Option<any, any>[] = [];
    args: Arg<any>[] = [];

    private _run?: (options: Partial<TOptions>) => TRun;

    die(msg: string): never {
        console.log(`Error: ${msg}`);
        console.log(`Usage: ${this.usageShort(true)}`);
        process.exit(1);
    }

    async tabComplete(cmd: string, pos: string, input: string, cacheKey: string): Promise<void> {
        input = input?.trim() ?? '';
        if (cmd) {
            const subCmd = this.subCmds.find(c => c.name === cmd);
            return subCmd?.tabComplete('', pos, input, `${cacheKey} ${subCmd.name}`);
        }
        if (pos.startsWith('--')) {
            const option = this.options.find(o => '--' + o.name === pos);
            await this._tabCompleteArg(cacheKey, pos, option?.arg, input);
        }
        else {
            await this._tabCompleteArg(cacheKey, pos, this.args[Number(pos)], input);
        }
    }

    private async _tabCompleteArg(cacheKey: string, pos: string, arg: Arg<any> | undefined, input: string) {
        
        const get = async (input: string) => {
            const result = await arg?._completions?.(input) ?? '';
            if (Array.isArray(result))
                return result?.join('\n') + '\n';


            else
                return result + '\n';
        };

        cacheKey = `${cacheKey} ${pos}`;
            
        const completions = arg?._completionsAreFiles
            ? (await get(input)).match(/[^\r\n]+/g) ?? []
            : await fsCache(cacheKey, 1000 * 60 * 60, input, () => get(''));

        console.log(arg?._completionsAreFiles ? 'f' : '');

        if (completions.length > 0)
            console.log(completions.join('\n'));
    }

    exec(args = argv.slice(2)) {

        this._inferAliases();

        if (args[0] === '@tab-c') {
            this.tabComplete(args[1], args[2], args[3], `${exeName()}@${this.version}`);
            return;
        }

        if (args[0] === '@cgen-lua') {
            console.log(generateClinkTabCompletionScript(args[1] ?? exeName(), this));
            return;
        }

        if (args[0] === '@cgen-lua-install') {
            const code = generateClinkTabCompletionScript(args[1] ?? exeName(), this);
            writeFileSync(args[2] ?? `C:\\clink\\my-completions\\${exeName()}.lua`, code);
            return;
        }

        const subCommandNameIndex = args.findIndex(arg => !arg.startsWith('-'));
        const subCommandName = args[subCommandNameIndex];
        const subCommand = this.subCmds.find(c => c.name === subCommandName);

        if (subCommand != null) {
            args.splice(subCommandNameIndex, 1);
            subCommand.exec(args);
            return;
        }

        const options = this._parseOptions(args) as TOptions & { help: boolean, version: boolean };
        if (options.version) {
            console.log(this.version ?? '0.0.1');
            return;
        }

        if (options.help) {
            console.log(this.usage());
            return;
        }

        if (this._run == null)
            return;

        const parsed = [];
        for (const arg of this.args) {
            parsed.push(this._parseArg(arg, args));
        }

        if (args.length > 0)
            this.die(`Unrecognized argument ${args[0]}`);

        let runner = this._run(options) as any;
        for (const arg of parsed) {
            runner = runner(arg);
        }
    }

    subcommand(name: string, help?: string): Command<TOptions, void> {
        const subCmd = new Command();
        subCmd.name = name;
        subCmd.help = help;
        subCmd.version = this.version;
        subCmd.parentCmd = this;
        subCmd.options = [...this.options];
        this.subCmds.push(subCmd);
        return subCmd as any;
    }

    option<TArg, TName extends string>(name: TName, arg: Arg<TArg>, usage?: string, alias?: string): Command<TOptions & Record<TName, TArg>, TRun> {
        this.options.push({ name, arg, usage, alias });
        return this as any;
    }

    switch<TName extends string>(name: TName, usage?: string, alias?: string): Command<TOptions & Record<TName, boolean>, TRun> {
        return this.option(name, empty(), usage, alias);
    }

    arg<TArg>(arg: Arg<TArg>): Command<TOptions, (arg: TArg) => TRun> {
        this.args.push(arg);
        return this as any;
    }

    usageShort(showParentOptions = false): string {
        this._inferAliases();
        const { name, options, args } = this;
        let result = exeName();

        if (name != null)
            result += ` ${name}`;

        if ((this.parentCmd?.options?.length ?? 0) > 0)
            result += ' [OPTION]...';

        for (const opt of options.filter(opt => showParentOptions || !this.parentCmd?.options?.includes(opt))) {
            if (opt.arg.displayName != null)
                result += ` [-${opt.alias ?? '-' + opt.name} ${opt.arg.displayName}]`;
            else
                result += ` [-${opt.alias ?? '-' + opt.name}]`;
        }

        for (const arg of args) {
            result += ` ${arg.displayName}`;
        }

        return result;
    }

    usage(): string {
        const { subCmds, name, help } = this;
        let maxNameLength = 0;
        const options = this.options.map(x => {
            const name = x.alias == null ? `--${x.name} ${x.arg.displayName ?? ''}` : `-${x.alias}, --${x.name} ${x.arg.displayName ?? ''}`;
            const usage = x.usage ?? '';
            maxNameLength = Math.max(name.length, maxNameLength);
            return { name, usage };
        });
        maxNameLength += 2;
        options.forEach(x => x.usage = `${' '.repeat(maxNameLength - x.name.length)}${x.usage}`);

        let result = exeName();

        if (subCmds.length > 0) {
            if (this._run != null)
                result += ' [COMMAND]';
            else
                result += ' COMMAND';
        }

        if (name != null)
            result += ` ${name}`;

        if (options.length > 0)
            result += ' [OPTION]...';

        for (const arg of this.args)
            result += ` ${arg.displayName}`;

        if (help != null)
            result += `\n${help}`;

        if (options.length > 0)
            result += `\n\n${options.map(x => `  ${x.name}${x.usage}`).join('\n')}`

        if (subCmds.length > 0)
            result += '\n';

        for (const subCmd of subCmds) {
            result += `\n${subCmd.usageShort()}`;
        }

        return result;
    }

    run(f: (options: Partial<TOptions>) => TRun): Command<TOptions, TRun> {
        this._run = f;
        return this;
    }

    _inferAliases() {
        const { options } = this;
        const aliases: string[] = [];
        for (const option of options) {
            if (option.alias != null)
                aliases.push(option.alias);
        }
        for (const option of options) {
            if (option.alias != null)
                continue;
            const guess = option.name.substr(0, 1);
            if (aliases.includes(guess))
                continue;

            option.alias = guess;
            aliases.push(guess);
        }
    }

    private _parseArg<TArg>(arg: Arg<TArg>, args: string[]): TArg {
        const r = arg.parse(args);
        if (r == null) {
            if (args.length === 0)
                this.die(`Missing argument ${arg.displayName}`);
            else
                this.die(`Bad argument ${arg.displayName} at ${args[0]}`);
        }
        args.splice(0, r[1]);
        return r[0];
    }

    private _parseOptions(args: string[]): TOptions {
        const { options } = this;
        const result: any = {};
        const dashDashIndex = args.indexOf('--');

        for (const option of options) {
            const { name, arg, alias } = option;
            let i = args.indexOf(`--${name}`);
            if (i === -1 && alias != null)
                i = args.indexOf(`-${alias}`);
            if (i === -1)
                continue;
            if (dashDashIndex >= 0 && i >= dashDashIndex)
                continue;

            const r = arg.parse(args.slice(i + 1));
            if (r == null)
                this.die(`Bad option ${args[i]} ${arg.displayName}`);

            result[option.name] = r[0];
            args.splice(i, 1 + r[1]);
        }

        const unrecognizedFlag = (dashDashIndex === -1 ? args : args.slice(0, dashDashIndex)).find(a => a.startsWith('-'));
        if (unrecognizedFlag != null) {
            if (/^-[^-]/.test(unrecognizedFlag) && options.find(o => o.name === unrecognizedFlag.slice(1))) {
                this.die(`Unrecognized flag ${unrecognizedFlag} (perhaps you meant -${unrecognizedFlag})`);
            }
            if (unrecognizedFlag.startsWith('--') && options.find(o => o.alias === unrecognizedFlag.slice(2)))
                this.die(`Unrecognized flag ${unrecognizedFlag} (perhaps you meant ${unrecognizedFlag.slice(1)})`);
            else
                this.die(`Unrecognized flag ${unrecognizedFlag}`);
        }

        return result;
    }
}

export function command(packageJson?: { description: string, version: string }): Command<{}, void> {
    const cmd = new Command()
        .switch('help', 'display this help')
        .switch('version', 'display version number');
    cmd.help = packageJson?.description;
    cmd.version = packageJson?.version;
    return cmd;
}

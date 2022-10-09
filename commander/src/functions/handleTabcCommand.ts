import { writeFileSync, mkdirSync } from 'fs';
import { TabcFunction } from '../TabcArg';
import { Arg } from "../Arg";
import { Command } from "../Command";
import { exeName } from './exeName';
import { Option } from '../Option';
import { completionsFolder } from './completionsFolder';
import { generateClinkTabCompletionScript } from '../clink-codegen';

export async function handleTabcCommand(args: string[], command: Command<any, any>) {

    const completionsDir = args[1] ?? completionsFolder();
    const name = exeName();

    switch (args[0]) {
        case 'genscript':

            process.stdout.write(`Installing ${name} auto-completion script in ${completionsDir}`);
            const code = generateClinkTabCompletionScript(args[2] ?? name, command);
            mkdirSync(completionsDir + '\\completions', { recursive: true });
            writeFileSync(`${completionsDir}\\completions\\${name}.lua`, code);
            console.log(' DONE');
            return;
        case 'genargs':
            const goArg = (a: Arg<any>): { key: string; fun: TabcFunction; }[] => a._completions?.kind === 'function' ? [{ key: a._completions.key, fun: a._completions.fun }] : [];
            const goOption = (o: Option<any, any>): { key: string; fun: TabcFunction; }[] => goArg(o.arg);
            const goCommand = (c: Command<any, any>): { key: string; fun: TabcFunction; }[] => [...c.args.flatMap(goArg), ...c.options.flatMap(goOption), ...c.subCmds.flatMap(goCommand)];

            const tabc = goCommand(command);
            const seen = new Set<string>();

            mkdirSync(completionsDir + '\\args', { recursive: true });
            for (var { key, fun } of tabc) {
                if (seen.has(key))
                    continue;
                seen.add(key);
                process.stdout.write(`Generating ${completionsDir}\\args\\${key}`);
                writeFileSync(`${completionsDir}\\args\\${key}`, (await fun()).join('\n'));
                console.log(' DONE');
            }
            return;
    }
}

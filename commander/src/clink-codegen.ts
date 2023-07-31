import { Arg } from "./Arg";
import { Command } from "./Command";

function prelude() {
    return [
        'local fmma = require("fmma-commander")'
    ].join('\n');
}

function helpSuffix(help: string | undefined) {
    if (!help)
        return ', ""';
    return `, "${help}"`
}

export function varName(name: string | undefined) {
    return name?.replace('-', '_');
}

export function generateClinkTabCompletionScript(exeName: string, cmd: Command<any, any>, register = true): string {
    const exeVarName = varName(exeName);
    cmd._inferAliases();


    const subDefs = cmd.subCmds.map(c => generateClinkTabCompletionScript(`${exeVarName}_${varName(c.name)}`, c, false));

    const noSubcommands = cmd.subCmds.length === 0;
    const noArgs = cmd.args.length === 0;

    const subcommands = noSubcommands ? [] : [
        `local ${exeVarName}_subcommands = {`,
        cmd.subCmds.map(
            c => `  {"${c.name}" .. ${exeVarName}_${varName(c.name)}_parser${helpSuffix(c.help)}}`
        ).join(',\n'),
        '}'
    ]

    const flags = [
        `local ${exeVarName}_flags = {`,
        '  nosort=true,',
        cmd.options.flatMap(f => [f.alias ? `"-${f.alias}"` : '', `"--${f.name}"`]
            .filter(x => x)
            .map(name => {
                const hasArg = f.arg.displayName;
                const arg = hasArg ? `..${arg_parser(f.arg)}, " ${f.arg.displayName}"` : '';
                let help = helpSuffix(f.usage);
                return `  {${name}${arg}${help}}`
            }
            )
        ).join(',\n'),
        '}'
    ]

    const lastArgIsMany = cmd.args[cmd.args.length - 1]?._many ?? false;

    const firstArg = noArgs
        ? noSubcommands
            ? []
            : [
                ':_addexarg({',
                '  nosort=true,',
                `  ${exeVarName}_subcommands`,
                '})',
            ]
        : noSubcommands
            ? [
                ':_addexarg({',
                '  nosort=true,',
                `  ${arg_parser(cmd.args[0])}`,
                '})',
            ]
            : [
                ':_addexarg({',
                '  nosort=true,',
                `  ${exeVarName}_subcommands,`,
                `  ${arg_parser(cmd.args[0])}`,
                '})',
            ]
        ;

    const parser = [
        `local ${exeVarName}_parser = fmma.parser()`,
        `:_addexflags(${exeVarName}_flags)`,
        ...firstArg,
        ...cmd.args.slice(1).map(a => `:_addexarg({nosort=true,${arg_parser(a)}})`),
        lastArgIsMany ? `:loop(${cmd.args.length})` : ':nofiles()'
    ];

    return [
        ...register ? [prelude()] : [],
        ...subDefs,
        '',
        `-- ${exeVarName}`,
        ...subcommands,
        ...flags,
        ...parser,
        ...register ? ['', `clink.arg.register_parser("${exeName}", ${exeVarName}_parser)`] : []
    ].join('\n');
}

function arg_parser(arg: Arg<any>) {
    if (arg._keywords != null)
        return `fmma.parser({${arg._keywords.map(x => `"${x}"`).join(', ')}})`;
    const tabc = arg._completions;
    if (tabc != null && tabc?.kind !== 'completionsAreFiles')
        return `fmma.arg("${tabc.key}")`;
    return `fmma.files()`;
}

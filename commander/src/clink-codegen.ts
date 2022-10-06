import { Arg } from "./Arg";
import { Command } from "./Command";

function prelude() {
    return [
        'local matchers = require("mymatchers")'
    ].join('\n');
}

function helpString(help: string | undefined) {
    if(!help)
        return '';
    return `, "${help}"`
}

export function generateClinkTabCompletionScript(exeName: string, cmd: Command<any, any>, register = true): string {
    const exeVarName = exeName.replace(/-/g, '_');
    cmd._inferAliases();

    const lastArgIsMany = cmd.args[0]?._many ?? false;

    const subCmdParsersDef = cmd.subCmds.map(c => generateClinkTabCompletionScript(`${exeVarName}_${c.name}`, c, false));
    const subCmdParsersRef = cmd.subCmds.map(x => `        {"${x.name}" .. ${exeVarName}_${x.name}_parser${helpString(x.help)}}`);
    const firstArg = cmd.args.slice(0, 1).map(x => `        {${arg_parser(x)}}`);
    const tailArgs = cmd.args.slice(1).map((x, i) => `:_addexarg({ ${arg_parser(x)} })`);

    const flags = cmd.options
        .map(x => x.arg.displayName ? `    {"--${x.name}" .. matchers.parser({${arg_parser(x.arg)}}), opteq=true${helpString(x.usage)}}` : `    {"--${x.name}", opteq=false${helpString(x.usage)}}`);
    const aliasFlags = cmd.options.filter(x => x.alias != null)
        .map(x => x.arg.displayName ? `    {"-${x.alias}" .. matchers.parser({${arg_parser(x.arg)}}), opteq=true${helpString(x.usage)}}` : `    {"-${x.alias}", opteq=false${helpString(x.usage)}}`);

    return [
        register ? [prelude()] : [],
        ...subCmdParsersDef,
        [
            `local ${exeVarName}_flags = {`,
            [
                ...flags,
                ...aliasFlags
            ].join(',\n'),
            '}',
            `local ${exeVarName}_parser = matchers.parser()${lastArgIsMany ? ':loop(1)' : ''}`,
            `:_addexflags(${exeVarName}_flags)`,
            ':_addexarg({',
            '    {',
            [
                ...subCmdParsersRef,
                ...firstArg
            ].join(',\n'),
            '    }',
            '})',
            tailArgs.join('\n')
        ].join('\n'),
        ...register ? [`clink.arg.register_parser("${exeName}", ${exeVarName}_parser)`] : []
    ].filter(x => x).join('\n\n');
}

function arg_parser(arg: Arg<any>) {
    if (arg._keywords != null)
        return `${arg._keywords.map(x => `"${x}"`).join(', ')}`;
    const tabc = arg._completions;
    if (tabc != null)
        return `matchers.arg_matcher("${tabc.key}", ${tabc.completionsAreFiles ?? false})`;
    return `matchers.arg_matcher("${arg.displayName}", true)`;
}

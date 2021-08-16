import { Arg } from "./Arg";
import { Command } from "./Command";

function prelude() {
    return [
        'local function arg_matcher(key, matchesAreFiles)',
        '    return function(word)',
        '        if matchesAreFiles then',
        '            clink.matches_are_files()',
        '        end',
        '        local result = {}',
        '        local file = io.popen("echo tabc;" .. key .. ";" .. word .. ";%CD% | nc 127.0.0.1 7113 || echo **ERROR: tab-completion server is down**")',
        '        for line in file:lines() do',
        '            table.insert(result, line)',
        '        end',
        '        return result',
        '    end',
        'end'
    ].join('\n');
}

export function generateClinkTabCompletionScript(exeName: string, cmd: Command<any, any>, register = true): string {
    const exeVarName = exeName.replace(/-/g, '_');
    cmd._inferAliases();
    const lastArgIsMany = cmd.args[0]?._many ?? false;
    return [
        register ? [prelude()] : [],
        ...cmd.subCmds.map(c => generateClinkTabCompletionScript(`${exeVarName}_${c.name}`, c, false)),
        [
            `local ${exeVarName}_parser = clink.arg.new_parser(`,
            [
                [
                    '    {',
                    [
                        ...cmd.subCmds.map(x => `        "${x.name}" .. ${exeVarName}_${x.name}_parser`),
                        ...cmd.args.slice(0, 1).map(x => `        ${arg_parser(x)}`)
                    ].join(',\n'),
                    '    }'
                ].join('\n'),
                ...cmd.args.slice(1).map((x, i) => `    { ${arg_parser(x)} }`),
                ...lastArgIsMany ? [] : ['    {}'],
                ...cmd.options.map(x => x.arg.displayName ? `    "--${x.name}" .. clink.arg.new_parser({${arg_parser(x.arg)}})` : `    "--${x.name}"`),
                ...cmd.options.filter(x => x.alias != null).map(x => x.arg.displayName ? `    "-${x.alias}" .. clink.arg.new_parser({${arg_parser(x.arg)}})` : `    "-${x.alias}"`),
            ].join(',\n'),
            lastArgIsMany ? '):loop(1)' : ')'
        ].join('\n'),
        ...register ? [`clink.arg.register_parser("${exeName}", ${exeVarName}_parser)`] : []
    ].filter(x => x).join('\n\n');
}

function arg_parser(arg: Arg<any>) {
    if (arg._keywords != null)
        return `${arg._keywords.map(x => `"${x}"`).join(', ')}`;
    const tabc = arg._completions;
    if (tabc != null)
        return [`arg_matcher("${tabc.key}", ${tabc.completionsAreFiles ?? false})`];
    return '';
}

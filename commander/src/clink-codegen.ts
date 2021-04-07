import { Arg } from "./Arg";
import { Command } from "./Command";

function prelude(exeName: string) {
    return [
        'local function arg_matcher(cmd, pos)',
        '    return function(word)',
        '        local result = {}',
        `        local file = io.popen("${exeName} @tab-c " .. cmd .. " " .. pos .. " " .. word)`,
        '        local firstLine = true',
        '        for line in file:lines() do',
        '            if firstLine then',
        '                firstLine = false',
        '                if string.find(line, "f") then',
        '                    clink.matches_are_files()',
        '                end',
        '            else',
        '                table.insert(result, line)',
        '            end',
        '        end',
        '        return result',
        '    end',
        'end'
    ].join('\n');
}

export function generateClinkTabCompletionScript(exeName: string, cmd: Command<any, any>, register = true): string {
    cmd._inferAliases();
    const lastArgIsMany = cmd.args[0]?._many ?? false;
    return [
        register ? [prelude(exeName)] : [],
        ...cmd.subCmds.map(c => generateClinkTabCompletionScript(`${exeName}_${c.name}`, c, false)),
        [
            `local ${exeName}_parser = clink.arg.new_parser(`,
            [
                [
                    '    {',
                    [
                        ...cmd.subCmds.map(x => `        "${x.name}" .. ${exeName}_${x.name}_parser`),
                        ...cmd.args.slice(0, 1).map(x => `        ${arg_parser(x, cmd.name, 0)}`)
                    ].join(',\n'),
                    '    }'
                ].join('\n'),
                ...cmd.args.slice(1).map((x, i) => `    { ${arg_parser(x, cmd.name, i + 1)} }`),
                ...lastArgIsMany ? [] : ['    {}'],
                ...cmd.options.map(x => x.arg.displayName ? `    "--${x.name}" .. clink.arg.new_parser({${arg_parser(x.arg, cmd.name, x.name)}})` : `    "--${x.name}"`),
                ...cmd.options.filter(x => x.alias != null).map(x => x.arg.displayName ? `    "-${x.alias}" .. clink.arg.new_parser({${arg_parser(x.arg, cmd.name, x.name)}})` : `    "-${x.alias}"`),
            ].join(',\n'),
            lastArgIsMany ? '):loop(1)' : ')'
        ].join('\n'),
        ...register ? [`clink.arg.register_parser("${exeName}", ${exeName}_parser)`] : []
    ].filter(x => x).join('\n\n');
}

function arg_parser(arg: Arg<any>, cmdName: string | undefined, pos: number | string) {
    if (arg._keywords != null)
        return `${arg._keywords.map(x => `"${x}"`).join(', ')}`;
    return [`arg_matcher("${cmdName ?? ''}", "${typeof pos === 'number' ? String(pos) : `--${pos}`}")`];
}

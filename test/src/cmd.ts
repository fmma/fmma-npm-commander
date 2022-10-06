import { command, filepath, keyword, number, stdIn, string, tabc } from '@fmma-npm/commander';

export const cmd = command({
    description: 'qqq er et test program af @fmma-npm/commander',
    version: '1.0.0'
})
    .switch('zoo')
    .switch('bar')
    .arg(stdIn())
    .run(opts => input => {
        /**
         * Long application code.
         */
        process.stdin.resume();
        input.then(input => console.log('command was run with ', opts, ' and stdin ', input));
    });

export const arg = { key: '102030', keep: -1, fun: () => ['10', '20', '30'] };

cmd.subcommand('add', 'Add repo')
    .arg(filepath().many(true))
    .option('force', number().completions(arg))
    .option('miljo', keyword('b', 'h').many(), 'database environment')
    .run(opts => fp => {
        console.log('add subcommand run', opts, fp);
    });
cmd.subcommand('rm', 'Remove repo')
    .arg(filepath('BRANCH'))
    .arg(filepath('REPO').many(true))
    .run(opts => branch => repos => {
        console.log('rm subcommand run', opts, branch, repos);
    });

export function fun() {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve({ completions: 'hello\nworld', keep: 2000 }),
            5000);
    })
}

#!/usr/bin/env node

import { command, filepath, keyword, number, string } from '@fmma-npm/commander';

const cmd = command({
    description: 'qqq er et test program af @fmma-npm/commander',
    version: '1.0.0'
})
    .switch('zoo')
    .switch('bar')
    .run(opts => {
        /**
         * Long application code.
         */
        console.log('command was run with ', opts);
    });

cmd.subcommand('add')
    .arg(filepath().many(true))
    .option('force', number().completions(() => ['10', '20', '30']))
    .option('miljo', keyword('b', 'h').many(), 'database environment')
    .run(opts => fp => {
        console.log('add subcommand run', opts, fp);
    });

cmd.subcommand('rm')
    .arg(string('BRANCH'))
    .arg(string('REPO').many(true))
    .run(opts => branch => repos => {
        console.log('rm subcommand run', opts, branch, repos);
    });

cmd.exec();
#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("@fmma-npm/commander");
const cmd = commander_1.command('Some command example', __dirname + '/../package.json')
    .switch('zoo')
    .switch('bar')
    .run(opts => {
    /**
     * Long application code.
     */
    console.log('command was run with ', opts);
});
cmd.subcommand('add')
    .arg(commander_1.filepath().many(true))
    .option('force', commander_1.number().completions(() => [10, 20, 30]))
    .option('miljo', commander_1.keyword('b', 'h').many(), 'database environment')
    .run(opts => fp => {
    console.log('add subcommand run', opts, fp);
});
cmd.subcommand('rm')
    .arg(commander_1.string('BRANCH'))
    .arg(commander_1.string('REPO').many(true))
    .run(opts => branch => repos => {
    console.log('rm subcommand run', opts, branch, repos);
});
cmd.exec();

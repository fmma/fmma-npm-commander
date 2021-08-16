import { TabcServer } from '@fmma-npm/commander';

const serv = new TabcServer(true);
serv.registerFile('D:\\projects\\fmma-npm\\commander\\test\\lib\\cmd.js', 'arg');
serv.registerFile('D:\\projects\\fmma-npm\\commander\\test\\node_modules\\@fmma-npm\\commander\\lib\\Arg.js', 'fileArg');
serv.start();

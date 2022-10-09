import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

export function completionsFolder() {
    console.log('Locating completions folder');
    const ret = spawnSync('clink.bat', ['installscripts', '--list']);
    const folders = ret.output
        .filter(x => x != null)
        .map(x => x?.toString())
        .join('')
        .replace(/\r/g, '')
        .split('\n')
        .filter(x => x);

    const clinkCompletionsFolder = folders.findIndex(f => f.includes('clink-completions'));
    if (clinkCompletionsFolder === -1)
        throw new Error('clink-completions must be installed');

    const commanderFolder = folders.findIndex(f => existsSync(f + '/modules/fmma-commander.lua'));

    if (clinkCompletionsFolder >= commanderFolder)
        throw new Error([
            'Please install a custom script folder AFTER clink-completions folder.',
            'installedscripts:',
            ...folders
        ].join('\n'));

    console.log('Found', folders[commanderFolder]);
    return folders[commanderFolder];
}

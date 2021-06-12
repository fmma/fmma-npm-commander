import { writeFile, readFile, existsSync } from 'fs';

export function fsCache(
    key: string,
    lifetimeMilliseconds: number,
    grep: string,
    getter: () => Promise<string>): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const path = `c:\\tmp\\clink-tabc-${key}`;
        if (existsSync(path)) {
            return readFile(path, (error, data) => {
                const dataString = data.toString();
                const lines = dataString.match(/[^\r\n]+/g) ?? [];
                const millisString = lines[0];
                const millis = +millisString;
                if (new Date().getTime() - millis > lifetimeMilliseconds) {
                    return getFromGetter(getter, path, resolve, grep);
                }
                return resolve(lines.slice(1).filter(x => x.startsWith(grep)));
            });
        }
        else {
            return getFromGetter(getter, path, resolve, grep);
        }
    });
}

function getFromGetter(getter: () => Promise<string>, path: string, resolve: (value: string[] | PromiseLike<string[]>) => void, grep: string) {
    getter().then(result => {
        writeFile(path, new Date().getTime() + '\n' + result, {}, () => { });
        
        const lines = result.match(/[^\r\n]+/g) ?? [];
        return resolve(lines.filter(x => x.startsWith(grep)));
    });
}

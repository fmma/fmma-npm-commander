import { createServer, Server, Socket } from 'net';
import { chdir } from 'process';

export type TabcFunctionReturn = string | string[];
export type TabcFunction = (input: string) => Promise<TabcFunctionReturn> | TabcFunctionReturn;

export interface TabcArg {
    key: string;
    fun: TabcFunction;
    keep: number;
    completionsAreFiles?: boolean;
}

export interface TabcThunk {
    arg: TabcArg;
    value?: string[];
    time: number;
}

export class TabcServer {

    tabcThunks = new Map<string, TabcThunk>()
    server: Server;

    constructor(readonly debug = false) {
        this.server = createServer({
            allowHalfOpen: true,
            pauseOnConnect: false
        }, socket => {
            socket.on('data', data => {
                this.handleData(socket, data);
            });
        });

    }

    start() {
        if (this.debug)
            console.log(stamp(`server started on port ${7113}`));
        this.server.listen(7113);
    }

    register(arg: TabcArg) {
        if (arg.keep < 0)
            arg.keep = Number.MAX_SAFE_INTEGER;
        this.tabcThunks.set(arg.key, {
            arg,
            time: 0
        });
    }

    registerFile(file: string, exportName: string) {
        const arg = require(file)[exportName];
        if (typeof arg?.key !== 'string') {
            this.handleError(new Error(`registerFile ${file} name ${exportName} did not have key.`))
            return;
        }
        this.register(arg);
        if (this.debug)
            console.log(stamp(`registered ${arg.key}`));
    }

    handleError = (error: Error | undefined) => {
        if (error)
            console.error(stamp(error.message ?? error));
    }

    async handleData(socket: Socket, data: Buffer) {
        const dataString = data.toString().trim();

        if (this.debug) {
            console.log(stamp(dataString));
        }

        const args = dataString.split(';');
        switch (args[0]) {
            case 'tabc':
                {
                    const key = args[1] ?? '';
                    const word = args[2] ?? '';
                    const cd = args[3] ?? '';

                    const thunk = this.tabcThunks.get(key);
                    if (thunk == null) {
                        this.handleError(new Error(`unrecognized tabc key ${key}`));
                        socket.write(`tabc-error: unrecognized tabc key ${key}`);
                        socket.destroy();
                        return;
                    }

                    if (cd && thunk.arg.completionsAreFiles) {
                        try {
                            chdir(cd);
                            if (this.debug) {
                                console.log(stamp(`changed dir to ${cd}`));
                            }

                        }
                        catch (err) {
                            this.handleError(err);
                        }
                    }
                    if (this.debug)
                        console.log(stamp(`thunk.time = ${thunk.time}, thunk.arg.keep = ${thunk.arg.keep}`));
                    if (thunk.value == null || new Date().getTime() - thunk.time > thunk.arg.keep) {
                        if (this.debug) {
                            if (thunk.value == null)
                                console.log(stamp(`computing result first time`));
                            else
                                console.log(stamp(`cache expired computing new result`));
                        }
                        const ret = await thunk.arg.fun(word);
                        if(this.debug)
                            console.log(stamp(`result computed`));
                        thunk.time = new Date().getTime();
                        if (typeof ret === 'string') {
                            thunk.value = ret.match(/[^\r\n]+/g) ?? [];
                        }
                        else {
                            thunk.value = ret;
                        }
                    }
                    else if (this.debug) {
                        console.log(stamp(`cache hit`));
                    }
                    socket.write(thunk.value!.filter(x => x.startsWith(word)).join('\n'), this.handleError);
                    socket.destroy();
                }
                return;
            case 'put':
                {
                    const key = args[1] ?? '';
                    const value = args[2] ?? '';
                    let keep = Number(args[3]?.trim() ?? -1);
                    if (keep === -1)
                        keep = Number.MAX_SAFE_INTEGER;
                    this.tabcThunks.set(key, {
                        time: new Date().getTime(),
                        value: [value],
                        arg: {
                            key: key,
                            fun: () => '',
                            keep: keep,
                            completionsAreFiles: false
                        }
                    })
                    if (this.debug) {
                        console.log(stamp(`value stored for ${key}`));
                        console.log(stamp(`heap used ${process.memoryUsage().heapUsed} bytes`))
                    }
                    socket.write(`OK`, this.handleError);
                    socket.destroy();
                }
                return;
            case 'register':
                {
                    const file = args[1];
                    const exportName = args[2];
                    this.registerFile(file, exportName);
                    socket.write(`OK`, this.handleError);
                    socket.destroy();
                }
                return;
        }

        this.handleError(new Error(`unrecognized command string ${dataString}`));
        socket.write(`tabc-error: unrecognized command string ${dataString}`);
        socket.destroy();
    }
}

function stamp(message: string) {
    const now = new Date();
    return `[tabc-server] ${now.toISOString().slice(0, -5)}: ${message}`;
}
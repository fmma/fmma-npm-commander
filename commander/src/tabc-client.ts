import { createConnection } from "net";

export async function tabc(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const socket = createConnection(7113, '127.0.0.1');
        socket.once('data', (data) => {
            const dataString = data.toString();
            if (dataString.startsWith('tabc-error: ')) {
                reject(dataString.slice(12));
            } else {
                resolve(dataString);
            }
            socket.destroy();
        }).once('connect', () => {
            socket.write(command);
        }).once('error', (err) => {
            reject(err)
        })
    });
}
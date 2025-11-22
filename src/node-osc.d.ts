declare module 'node-osc' {
    export class Client {
        constructor(host: string, port: number);
        send(address: string, ...args: any[]): void;
        close(): void;
    }
    export class Server {
        constructor(port: number, host: string, cb?: () => void);
        close(): void;
    }
}

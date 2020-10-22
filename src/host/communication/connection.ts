import WebSocket from "ws";
import { URL } from "url";
import { randomString } from "../../utils";
import { EventEmitter } from "events";
import fetch from "node-fetch";
import { silly, warn } from "../../log";

type Message = {
    t: "u";
    m: { f: string; t: string; o: "message" };
    p: { signal: string };
};

export default class Connection extends EventEmitter {
    connected = false;
    gameCode: string;
    private name: string;
    private server: string;
    private socket: WebSocket;
    private iceServers: string[];

    constructor(server: string) {
        super();
        this.server = server;
    }

    close() {
        silly("Closing connection", this.gameCode);
        if (this.socket) {
            this.socket.close();
        }
    }

    async connect(target: string | "host") {
        if (!(await this.checkEnabled())) {
            throw new Error("Server reported that multiplayer is offline");
        }
        silly("Creating connection with target", target);

        // if connecting to an existing game, generate a random name
        // otherwise use "host" and let server generate game ID
        let name = randomString(8);
        let gameID = target;
        if (target === "host") {
            name = target;
            gameID = "";
        }
        this.name = name;
        this.gameCode = await this.getGameCode(gameID);

        // generate a websocket connection and wait for it to open before resolving
        const socket = await this.generateWebsocket(name, this.gameCode);
        this.socket = socket;
        return new Promise((res, rej) => {
            let pingInterval: NodeJS.Timeout;
            socket.on("open", async () => {
                this.connected = true;
                pingInterval = setInterval(() => {
                    socket.send("ping");
                }, 800);
                this.emit("open");
                res();
            });
            socket.on("close", () => {
                clearInterval(pingInterval);
                this.connected = false;
                this.emit("close");
            });
            socket.on("message", (msg) => this.handleMessage(msg));
            socket.on("error", (err) => rej(err));
        }) as Promise<void>;
    }

    send(to: string, signal: string) {
        if (!this.connected) {
            throw new Error("Cannot send on unconnected socket");
        }
        const msg: Message = {
            t: "u",
            m: {
                f: `${this.gameCode}/${this.name}`,
                t: to,
                o: "message",
            },
            p: {
                signal,
            },
        };
        this.socket.send(JSON.stringify(msg));
    }

    async getIceServers(code = this.gameCode) {
        if (code === this.gameCode && this.iceServers) {
            return this.iceServers;
        }

        const server = ((await (
            await fetch(this.url(`/get-ice-candidates/${code}`))
        ).json()) as {
            v: { iceServers: { urls: string } };
        }).v?.iceServers?.urls;

        let iceServers = server ? [server] : ["stun:stun.l.google.com:19302"];
        if (code === this.gameCode) {
            this.iceServers = iceServers;
        }
        return iceServers;
    }

    private handleMessage(msg: WebSocket.Data) {
        let data: Message;
        try {
            data = JSON.parse(msg.toString());
        } catch (e) {
            warn("Received invalid WebSocket message", msg.toString());
            return;
        }

        if (data.m.t === this.name) {
            this.emit("message", data);
        } else {
            warn(
                "Received message intended for someone else",
                msg.toString(),
                this.name
            );
        }
    }

    private async generateWebsocket(name: string, code: string) {
        if (name === "host") {
            await this.createChannel(code);
        }
        const [token, host] = await Promise.all([
            this.getSignalingToken(code, name),
            this.getSignalingHost(code, name),
        ]);

        return new WebSocket(`${host}/v2/${token}`);
    }

    private url(path: string) {
        return new URL(path, this.server).toString();
    }

    private async checkEnabled() {
        return !!((await (
            await fetch(this.url("/game/multiplayer-enabled"))
        ).json()) as { multiplayerEnabled: boolean })?.multiplayerEnabled;
    }

    private async getGameCode(id: string) {
        if (id === "host") {
            id = "";
        }
        const code = ((await (await fetch(this.url(`/game/${id}`))).json()) as {
            code: string;
        })?.code;

        if (!code) {
            throw new Error(`Server didn't return valid code for game ${id}`);
        }
        return code;
    }

    private async createChannel(code: string) {
        await fetch(this.url(`/create-channel/${code}`));
    }

    private async getSignalingToken(code: string, name: string) {
        const token = ((await (
            await fetch(this.url(`/get-signaling-token/${code}/${name}`))
        ).json()) as {
            v: string;
        })?.v;

        if (!token) {
            throw new Error(
                `Server didn't return valid signaling token for ${code}/${name}`
            );
        }
        return token;
    }

    private async getSignalingHost(code: string, name: string) {
        const host = ((await (
            await fetch(this.url(`/get-signaling-host/${code}/${name}`))
        ).json()) as {
            v: string;
        })?.v;

        if (!host) {
            throw new Error(
                `Server didn't return valid signaling host for ${code}/${name}`
            );
        }
        return host;
    }
}

// allow TypeScript to check events for our connection
interface ConnectionEvents {
    message: (msg: Message) => void;
    open: () => void;
    close: () => void;
}
export default interface Connection {
    on<E extends keyof ConnectionEvents>(
        event: E,
        listener: ConnectionEvents[E]
    ): this;
    emit<E extends keyof ConnectionEvents>(
        event: E,
        ...args: Parameters<ConnectionEvents[E]>
    ): boolean;
}

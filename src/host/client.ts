import Peer from "simple-peer";
import wrtc from "wrtc";
import { EventEmitter } from "events";
import Connection from "./communication/connection";
import World from "./game/world";
import {
    ChangedBlocksMessage,
    ClientMessage,
    HostMessage,
    WelcomeMessage,
} from "./types";
import { error, log, silly, warn } from "../log";

export default class PeerClient extends EventEmitter {
    connected = false;
    private connection: Connection;
    private peer: Peer.Instance;
    private welcomeInfo: WelcomeMessage;

    constructor(connection: Connection) {
        super();
        this.connection = connection;

        this.connection.on("open", () => this.initialize());
        this.connection.on("message", (msg) =>
            this.handleSignaling(msg.p.signal)
        );
        if (connection.connected) {
            this.initialize();
        }
    }

    async fetchWorld(): Promise<World> {
        silly("Fetching world", this.connected);
        return new Promise((res, rej) => {
            if (!this.connected) {
                silly("Waiting until connected");
                this.once("welcome", () => {
                    this.fetchWorld()
                        .then((world) => res(world))
                        .catch((e) => rej(e));
                });
                return;
            }

            log("Basing off of world information from host", {
                seed: this.welcomeInfo.worldSeed,
                size: this.welcomeInfo.worldSize,
            });
            const world = new World(
                this.welcomeInfo.worldSeed,
                this.welcomeInfo.worldSize
            );

            // if remote doesn't have any data, they won't send a message (really Mojang?)
            const noResponseTimeout = setTimeout(() => {
                silly("Didn't receive a response, presuming no changes");
                res(world);
            }, 500);

            let index = 0;
            this.message("Synchronizing");
            const onChanges = (data: ChangedBlocksMessage) => {
                clearTimeout(noResponseTimeout);
                if (data.from !== index) {
                    warn(
                        `Received out-of-order block changes, expected ${index} got ${data.from}`
                    );
                    return;
                }
                world.addChanges(data.blocks);
                silly(`Received new blocks`, data.from, data.blocks.length);
                if (data.blocks.length >= 1000) {
                    index += 1000;
                    if (this.welcomeInfo.numberOfChangedBlocks >= 1e6) {
                        this.message(
                            `Synchronizing (${Math.round(
                                (100 * index) /
                                    this.welcomeInfo.numberOfChangedBlocks
                            )}%)`
                        );
                    }
                    this.send({
                        type: "requestChanges",
                        from: index,
                    });
                } else {
                    silly("Finished receiving blocks");
                    this.message("Synchronized");
                    this.off("changes", onChanges);
                    res(world);
                }
            };
            this.on("changes", onChanges);
            this.send({
                type: "requestChanges",
                from: index,
            });
        });
    }

    close() {
        log("Closing client");
        this.peer.destroy();
    }

    private async initialize() {
        const iceServers = await this.connection.getIceServers();
        this.peer = new Peer({
            initiator: true,
            trickle: false,
            config: {
                iceServers: [
                    {
                        urls: iceServers,
                    },
                ],
            } as RTCConfiguration,
            wrtc,
        });

        this.peer.on("signal", (signal) => {
            this.connection.send("host", signal);
        });
        this.peer.on("data", (data) =>
            this.handleMessage(JSON.parse(data.toString()))
        );
        this.peer.on("error", (err) => {
            error("Error in client", err);
        });

        this.peer.on("connect", () => {
            silly("Client connected to host");
            this.send({ type: "connected" });
        });
    }

    private send(message: ClientMessage) {
        silly("Sending message to host", message);
        this.peer.send(JSON.stringify(message));
    }

    message(text: string) {
        this.send({
            type: "message",
            message: {
                from: "",
                message: `<host> ${text}`,
                timestamp: Date.now(),
                type: "local",
            },
        });
    }

    private handleMessage(message: HostMessage) {
        switch (message.type) {
            case "welcomeInfo":
                log("Received welcome information");
                this.connected = true;
                this.welcomeInfo = message;
                this.emit("welcome", message);
                break;
            case "changedBlocks":
                this.emit("changes", message);
            case "players":
                break;
            default:
                warn("Unsupported message", message);
        }
    }

    private handleSignaling(signaling: string) {
        if (!this.peer) {
            return;
        }
        this.peer.signal(signaling);
    }
}

// allow TypeScript to check events for our connection
interface ClientEvents {
    welcome: (data: WelcomeMessage) => void;
    changes: (data: ChangedBlocksMessage) => void;
}
export default interface PeerClient {
    on<E extends keyof ClientEvents>(event: E, listener: ClientEvents[E]): this;
    once<E extends keyof ClientEvents>(
        event: E,
        listener: ClientEvents[E]
    ): this;
    emit<E extends keyof ClientEvents>(
        event: E,
        ...args: Parameters<ClientEvents[E]>
    ): boolean;
}

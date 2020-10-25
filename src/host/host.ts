import Peer from "simple-peer";
import wrtc from "wrtc";
import { EventEmitter } from "events";
import Connection from "./communication/connection";
import World from "./game/world";
import {
    ClientMessage,
    FireMessage,
    HostMessage,
    PlayerStateMessage,
    RequestChangesMessage,
    WelcomeMessage,
} from "./types";
import Player from "./game/player";
import { error, log, silly, warn } from "../log";

export default class PeerHost extends EventEmitter {
    connected = false;
    world: World;
    private connection: Connection;
    private players: { [k: string]: Player } = {};
    private updateInterval: NodeJS.Timeout;

    constructor(connection: Connection, world: World) {
        super();
        this.connection = connection;
        this.world = world;

        this.connection.on("message", (msg) =>
            this.handleSignaling(msg.m.f, msg.p.signal)
        );

        this.updateInterval = setInterval(() => this.update(), 50);
    }

    close() {
        Object.values(this.players).forEach((player) => player.close());
    }

    private update() {
        this.broadcastPlayers();
    }

    private sendTo(id: string, message: HostMessage) {
        if (!this.players[id]) {
            throw new Error(
                `Attempting to send message to unknown peer "${id}"`
            );
        }

        if (!this.players[id].connected) {
            return;
        }
        this.players[id].peer.send(JSON.stringify(message));
    }

    private broadcast(message: HostMessage, except: string[] = []) {
        const blacklisted: { [k: string]: boolean } = {};
        except.forEach((v) => (blacklisted[v] = true));
        Object.keys(this.players).forEach((id) => {
            const player = this.players[id];
            if (!player.connected) {
                return;
            }
            if (blacklisted[id]) {
                return;
            }
            this.sendTo(id, message);
        });
    }

    private message(id: string, message: string) {
        if (!this.players[id]) {
            throw new Error(
                `Attempting to send chat message to unknown peer "${id}"`
            );
        }

        this.sendTo(id, {
            type: "chatLog",
            chatLog: [
                {
                    from: "",
                    message: `<host>: ${message}`,
                    timestamp: Date.now(),
                    type: "local",
                },
            ],
        });
    }

    private broadcastPlayers() {
        const players = Object.keys(this.players)
            .map((id) => {
                const p = this.players[id];
                if (!p.state) {
                    return undefined;
                }
                return {
                    name: p.state?.name || "",
                    id: id,
                    state: p.state,
                };
            })
            .filter((v) => v);
        this.broadcast({ type: "players", players });
    }

    private handleMessage(from: string, message: ClientMessage) {
        switch (message.type) {
            case "connected":
                log("Client connected", from);
                this.sendWelcome(from);
                break;
            case "requestChanges":
                this.sendChanges(from, message);
                break;
            case "playerState":
                this.handlePlayerState(from, message);
                break;
            case "fireEvent":
                this.handleFireEvent(from, message);
                break;
            case "message":
                Object.values(this.players).forEach((p) => {
                    this.sendTo(p.id, {
                        type: "chatLog",
                        chatLog: [message.message],
                    });
                });
                break;
            default:
                warn("Unsupported message", message);
        }
    }

    private sendWelcome(to: string) {
        this.sendTo(to, {
            type: "welcomeInfo",
            gameFull: false,
            hostName: "test",
            maxPlayers: 999,
            numberOfChangedBlocks: this.world.getChanges().length,
            playerCount: Object.keys(this.players).length,
            spawnPoint: null,
            worldSeed: this.world.seed,
            worldSize: this.world.size,
        });
    }

    private sendChanges(from: string, message: RequestChangesMessage) {
        const blocks = this.world.getChanges(message.from, message.from + 1000);
        if (message.from !== this.world.numChanges) {
            silly(
                "Sending world to",
                from,
                message.from,
                this.world.numChanges
            );
        }
        if (blocks.length) {
            this.sendTo(from, {
                type: "changedBlocks",
                blocks: blocks,
                from: message.from,
            });
            if (this.world.numChanges - message.from > 1000) {
                this.message(
                    from,
                    `Synchronizing (${Math.round(
                        (100 *
                            Math.min(
                                message.from + 1000,
                                this.world.numChanges
                            )) /
                            this.world.numChanges
                    )}%)`
                );
            }
        }
    }

    private handlePlayerState(from: string, message: PlayerStateMessage) {
        const player = this.players[from];
        if (!player) {
            throw new Error(
                `Received player state from unknown player "${from}"`
            );
        }

        player.state = {
            ...message.data.state,
        };
    }

    private handleFireEvent(from: string, message: FireMessage) {
        this.broadcast(message, [from]);
        const change = message.data;

        const pos = change.addMode
            ? change.targetedBlockAdjacentPosition
            : change.targetedBlockPosition;

        this.world.setBlock(pos, change.addMode ? change.chosenBlock + 1 : 0);
    }

    private handleSignaling(from: string, signaling: string) {
        log("Received signaling from new client", from);
        const sender = from.split("/")[1];
        if (!sender) {
            throw new Error(`Invalid sender "${from}"`);
        }
        if (this.players[sender]) {
            throw new Error(
                `Signaling received from existing player ${sender}`
            );
        }

        const peer = new Peer({ initiator: false, wrtc: wrtc });
        this.players[sender] = new Player(sender, peer);
        peer.signal(signaling);
        peer.on("signal", (signal) => {
            this.connection.send(sender, signal);
        });
        peer.on("data", (data) =>
            this.handleMessage(sender, JSON.parse(data.toString()))
        );
        peer.on("error", (err) => {
            error("Error in host from", sender, err);
        });
        peer.on("close", () => {
            this.players[sender].close();
            delete this.players[sender];
            Object.values(this.players).forEach((p) => {
                this.sendTo(p.id, {
                    type: "chatLog",
                    chatLog: [
                        {
                            from: sender,
                            message: "",
                            timestamp: Date.now(),
                            type: "left",
                        },
                    ],
                });
            });
        });
    }
}

// allow TypeScript to check events for our connection
interface HostEvents {}
export default interface PeerHost {
    on<E extends keyof HostEvents>(event: E, listener: HostEvents[E]): this;
    once<E extends keyof HostEvents>(event: E, listener: HostEvents[E]): this;
    emit<E extends keyof HostEvents>(
        event: E,
        ...args: Parameters<HostEvents[E]>
    ): boolean;
}

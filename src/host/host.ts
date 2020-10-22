import Peer from "simple-peer";
import wrtc from "wrtc";
import { EventEmitter } from "events";
import Connection from "./communication/connection";
import World from "./game/world";
import { ClientMessage, HostMessage, WelcomeMessage } from "./types";
import Player from "./game/player";
import { error, log, silly } from "../log";

export default class PeerHost extends EventEmitter {
    connected = false;
    world: World;
    private connection: Connection;
    private players: { [k: string]: Player } = {};
    private welcomeInfo: WelcomeMessage;

    constructor(connection: Connection, world: World) {
        super();
        this.connection = connection;
        this.world = world;

        this.connection.on("message", (msg) =>
            this.handleSignaling(msg.m.f, msg.p.signal)
        );
    }

    close() {
        Object.values(this.players).forEach((player) => player.close());
    }

    private sendTo(id: string, message: HostMessage) {
        if (!this.players[id]) {
            throw new Error(
                `Attempting to send message to unknown peer "${id}"`
            );
        }
        silly("Sending message to", id, message);

        this.players[id].peer.send(JSON.stringify(message));
    }

    private message(id: string, message: string) {
        if (!this.players[id]) {
            throw new Error(
                `Attempting to send chat message to unknown peer "${id}"`
            );
        }

        this.players[id].registerChatMessage({
            from: "",
            message: `<host>: ${message}`,
            timestamp: Date.now(),
            type: "local",
        });
        this.sendTo(id, { type: "chatLog", chatLog: this.players[id].chatLog });
    }

    private handleMessage(from: string, message: ClientMessage) {
        const player = this.players[from];
        if (!player) {
            throw new Error(`Received message from unknown player "${from}"`);
        }

        switch (message.type) {
            case "connected":
                log("Client connected", from);
                this.sendTo(from, {
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
                break;
            case "requestChanges":
                const changes = this.world.getChanges();
                silly("Sending world to", from, message.from, changes.length);
                const blocks = changes.slice(message.from, message.from + 1000);
                if (blocks.length) {
                    this.sendTo(from, {
                        type: "changedBlocks",
                        blocks: blocks,
                        from: message.from,
                    });
                    this.message(
                        from,
                        `Synchronizing (${Math.round(
                            (100 * message.from) / changes.length
                        )}%)`
                    );
                }

                break;
        }
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
            delete this.players[sender];
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

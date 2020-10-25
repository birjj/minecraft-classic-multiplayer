import { ChatMessage, PlayerStateMessage } from "../types";

import type Peer from "simple-peer";

export default class Player {
    id: string;
    peer: Peer.Instance;
    connected: boolean = false;
    state?: PlayerStateMessage["data"]["state"];

    constructor(id: string, peer: Peer.Instance) {
        this.id = id;
        this.peer = peer;

        peer.on("connect", () => {
            this.connected = true;
        });
        peer.on("close", () => {
            this.connected = false;
        });
    }

    close() {
        this.peer.destroy();
    }
}

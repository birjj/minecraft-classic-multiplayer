import { ChatMessage } from "../types";

import type Peer from "simple-peer";

export default class Player {
    id: string;
    peer: Peer.Instance;
    chatLog: ChatMessage[] = [];

    constructor(id: string, peer: Peer.Instance) {
        this.id = id;
        this.peer = peer;
    }

    close() {
        this.peer.destroy();
    }

    registerChatMessage(msg: ChatMessage) {
        this.chatLog.push(msg);
        this.chatLog = this.chatLog.slice(-20);
    }
}

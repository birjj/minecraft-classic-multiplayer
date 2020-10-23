export type ChatMessage = {
    message: string;
    timestamp: number;
    from: string;
    type: "message" | "local" | "left" | "joined";
};

// Host->player messages
export type WelcomeMessage = {
    type: "welcomeInfo";
    hostName: string;
    gameFull: boolean;
    playerCount: number;
    maxPlayers: number;
    worldSeed: number;
    worldSize: number;
    spawnPoint: null;
    numberOfChangedBlocks: number;
};
export type ChatLogMessage = {
    type: "chatLog";
    chatLog: ChatMessage[];
};
export type FireMessage = {
    type: "fireEvent";
    data: {
        targetedBlockBlockID: number;
        targetedBlockPosition: [number, number, number];
        targetedBlockAdjacentPosition: [number, number, number];
        chosenBlock: number;
        addMode: boolean;
    };
};
export type PlayersMessage = {
    type: "players";
    players: {
        name: string;
        id: string;
        state: {
            name: string;
            position: { x: number; y: number; z: number };
            rotation: { x: number; y: number; z: number };
            walking: boolean;
            spawned: boolean;
        };
    }[];
};
export type KickedMessage = {
    type: "kicked";
};
export type ChangedBlocksMessage = {
    type: "changedBlocks";
    blocks: { p: [number, number, number]; add: boolean; bt: number }[];
    from: number;
};
export type HostMessage =
    | WelcomeMessage
    | ChatLogMessage
    | FireMessage
    | PlayersMessage
    | KickedMessage
    | ChangedBlocksMessage;

// Player->host messages
export type ConnectedMessage = {
    type: "connected";
};
export type PlayerStateMessage = {
    type: "playerState";
    data: {
        state: {
            name: string;
            position: { x: number; y: number; z: number };
            rotation: { x: number; y: number; z: number };
            walking: boolean;
            spawned: boolean;
        };
    };
};
export type SetBlockMessage = {
    type: "setBlockTypeAt";
    data: {
        blockTypeId: number;
        position: [number, number, number];
    };
};
export type ChatMessageMessage = {
    type: "message";
    message: ChatMessage;
};
export type RequestChangesMessage = {
    type: "requestChanges";
    from: number;
};
export type ClientMessage =
    | ConnectedMessage
    | PlayerStateMessage
    | SetBlockMessage
    | FireMessage
    | ChatMessageMessage
    | RequestChangesMessage;

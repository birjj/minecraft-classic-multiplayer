export type ChatMessage = {
    message: string;
    timestamp: number;
    from: string;
    type: "message" | "local" | "left" | "joined";
};

export enum BlockID {
    AIR = 0,
    GRASS = 1,
    STONE = 2,
    DIRT = 3,
    WOOD = 4,
    RED_FLOWER = 5,
    YELLOW_FLOWER = 6,
    WATER = 7,
    SAPLING = 8,
    COBBLE = 9,
    BEDROCK = 10,
    SAND = 11,
    GRAVEL = 12,
    LOG = 13,
    LEAF = 14,
    RED_MUSHROOM = 15,
    BROWN_MUSHROOM = 16,
    LAVA = 17,
    GOLD_ORE = 18,
    IRON_ORE = 19,
    COAL_ORE = 20,
    GOLD = 21,
    SPONGE = 22,
    GLASS = 23,
    COLOR_0 = 24,
    COLOR_1 = 25,
    COLOR_2 = 26,
    COLOR_3 = 27,
    COLOR_4 = 28,
    COLOR_5 = 29,
    COLOR_6 = 30,
    COLOR_7 = 31,
    COLOR_8 = 32,
    COLOR_9 = 33,
    COLOR_10 = 34,
    COLOR_11 = 35,
    COLOR_12 = 36,
    COLOR_13 = 37,
    COLOR_14 = 38,
    COLOR_15 = 39,
}

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

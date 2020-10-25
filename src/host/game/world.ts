import { EventEmitter } from "events";
import { error, silly } from "../../log";
import { BlockID } from "../types";
import { generateLevel } from "./worldGen/worker";

type BlockChange = {
    p: [number, number, number];
    add: boolean;
    bt: number;
    time: number;
};

export default class World extends EventEmitter {
    seed: number;
    size: number;
    private tiles: number[] = [];
    private changes: BlockChange[] = [];

    constructor(seed: number, size = 128) {
        super();
        this.seed = seed;
        this.size = size;

        silly("Generating world", seed, size);
        try {
            this.tiles = generateLevel({ seed, worldSize: size });
        } catch (e) {
            error(e);
        }
        silly("Generated world", this.tiles.length);
    }

    get numChanges() {
        return this.changes.length;
    }

    addChanges(changes: Omit<BlockChange, "time">[]) {
        this.changes = this.changes.concat(
            changes.map((c) => ({
                ...c,
                time: Date.now(),
            }))
        );
    }

    getChanges(
        from = 0,
        to = this.changes.length
    ): Omit<BlockChange, "time">[] {
        return this.changes.slice(from, to).map((c) => {
            const v = { ...c };
            delete v.time;
            return v;
        });
    }

    setBlock(pos: [number, number, number], value: number) {
        const [x, y, z] = pos;

        const change = {
            add: value !== 0,
            bt: value,
            p: pos,
            time: Date.now(),
        };
        this.changes.push(change);

        const index = (y * this.size + z) * this.size + x;
        if (index >= this.tiles.length) {
            error(
                "Attempted to set block out of bounds",
                [x, y, z],
                this.tiles.length
            );
        } else {
            this.tiles[index] = value;
        }

        if (value === BlockID.SPONGE) {
            this.handleSponge(pos);
        }

        this.emit("change", change);
    }

    getBlock([x, y, z]: [number, number, number]) {
        const index = (y * this.size + z) * this.size + x;
        if (index >= this.tiles.length) {
            error("Index is out of bounds", [x, y, z], this.tiles.length);
            return 0;
        }
        return this.tiles[index];
    }

    handleSponge([x, y, z]: [number, number, number]) {
        for (let dx = -2; dx <= 2; ++dx) {
            for (let dy = -2; dy <= 2; ++dy) {
                for (let dz = -2; dz <= 2; ++dz) {
                    if (dx === 0 && dy === 0 && dz === 0) {
                        continue;
                    }
                    const pos = [x + dx, y + dy, z + dz] as [
                        number,
                        number,
                        number
                    ];

                    const block = this.getBlock(pos);
                    if (block === BlockID.WATER) {
                        this.setBlock(pos, BlockID.AIR);
                    }
                }
            }
        }
    }

    floodFill(from: [number, number, number], through: number[], to: number) {
        let i = 0;
        const seen: Set<string> = new Set();
        const whitelist: Set<number> = new Set();
        through.forEach((v) => whitelist.add(v));
        const isInBounds = ([x, y, z]: [number, number, number]) =>
            x >= 0 &&
            x < this.size &&
            y >= 0 &&
            y < 64 &&
            z >= 0 &&
            z < this.size;
        const step = ([x, y, z]: [number, number, number]) => {
            if (i > 1e6) {
                return;
            }
            ++i;
            const neighbors: [number, number, number][] = [
                [x, y + 1, z], // up
                [x, y - 1, z], // down
                [x - 1, y, z], // left
                [x + 1, y, z], // right
                [x, y, z - 1], // in
                [x, y, z + 1], // out
            ];
            neighbors.forEach((pos) => {
                if (!isInBounds(pos)) {
                    return;
                }
                const key = pos.join("-");
                if (seen.has(key)) {
                    return;
                }
                seen.add(key);
                const block = this.getBlock(pos);
                if (whitelist.has(block)) {
                    this.setBlock(pos, to);
                    step(pos);
                }
            });
        };
        step(from);
    }
}

type WorldEvents = {
    change: (change: BlockChange) => void;
};

export default interface World {
    on<E extends keyof WorldEvents>(event: E, listener: WorldEvents[E]): this;
    once<E extends keyof WorldEvents>(event: E, listener: WorldEvents[E]): this;
    emit<E extends keyof WorldEvents>(
        event: E,
        ...args: Parameters<WorldEvents[E]>
    ): boolean;
}

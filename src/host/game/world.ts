type BlockChange = {
    p: [number, number, number];
    add: boolean;
    bt: number;
    time: number;
};

export default class World {
    seed: number;
    size: number;
    private changes: Map<string, BlockChange>;

    constructor(seed: number, size = 128) {
        this.seed = seed;
        this.size = size;
        this.changes = new Map();
    }

    addChanges(changes: Omit<BlockChange, "time">[]) {
        changes.forEach((c) => {
            this.changes.set(c.p.join("-"), {
                ...c,
                time: Date.now(),
            });
        });
    }

    getChanges() {
        const outp: Omit<BlockChange, "time">[] = [];
        for (let c of this.changes.values()) {
            const v = { ...c };
            delete v.time;
            outp.push(c);
        }
        return outp;
    }

    setBlock(pos: [number, number, number], value: number) {
        this.changes.set(pos.join("-"), {
            p: pos,
            add: value !== 0,
            bt: value,
            time: Date.now(),
        });
    }
}

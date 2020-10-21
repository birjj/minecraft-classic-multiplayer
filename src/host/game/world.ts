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
    private cachedChangesArr: Omit<BlockChange, "time">[];

    constructor(seed: number, size = 128) {
        this.seed = seed;
        this.size = size;
        this.changes = new Map();
    }

    addChanges(changes: Omit<BlockChange, "time">[]) {
        delete this.cachedChangesArr;
        changes.forEach((c) => {
            this.changes.set(c.p.join("-"), {
                ...c,
                time: Date.now(),
            });
        });
    }

    getChanges() {
        if (this.cachedChangesArr) {
            return this.cachedChangesArr;
        }
        const outp: Omit<BlockChange, "time">[] = [];
        for (let c of this.changes.values()) {
            const v = { ...c };
            delete v.time;
            outp.push(c);
        }
        this.cachedChangesArr = outp;
        return outp;
    }

    setBlock(pos: [number, number, number], value: number) {
        delete this.cachedChangesArr;
        this.changes.set(pos.join("-"), {
            p: pos,
            add: value !== 0,
            bt: value,
            time: Date.now(),
        });
    }
}

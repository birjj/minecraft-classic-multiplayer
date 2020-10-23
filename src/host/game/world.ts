type BlockChange = {
    p: [number, number, number];
    add: boolean;
    bt: number;
    time: number;
};

export default class World {
    seed: number;
    size: number;
    private changes: BlockChange[] = [];

    constructor(seed: number, size = 128) {
        this.seed = seed;
        this.size = size;
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
        this.changes.push({
            add: value !== 0,
            bt: value,
            p: [...pos],
            time: Date.now(),
        });
    }
}

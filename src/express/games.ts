import express from "express";
import { randomString } from "../utils";

const db: { [id: string]: Game } = {};
class Game {
    id: string;
    createdAt = Date.now();
    updatedAt = Date.now();

    constructor(id: string) {
        this.id = id;
    }
}
const handler = {
    create: () => {
        const id = `mcmp_${randomString(16)}`;
        const game = new Game(id);
        db[id] = game;
        return game;
    },

    get: (id: string) => {
        return db[id];
    },
};
export default handler;

// Define routes
export const router = express.Router();
router.get("/multiplayer-enabled", (_, res) => {
    res.send({ multiplayerEnabled: "true" });
});
router.options("/:id/heartbeat", (req, res) => {
    const game = handler.get(req.params.id);
    if (!game) {
        return res
            .status(404)
            .send({ error: `No game with ID ${req.params.id}` });
    }
    res.send({
        code: game.id,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        ttl: Number.MAX_SAFE_INTEGER,
    });
});
router.put("/:id/heartbeat", (req, res) => {
    const game = handler.get(req.params.id);
    if (!game) {
        return res
            .status(404)
            .send({ error: `No game with ID ${req.params.id}` });
    }
    game.updatedAt = Date.now();
    res.send({});
});
router.get("/:id", (req, res) => {
    const game = handler.get(req.params.id);
    if (!game) {
        return res
            .status(404)
            .send({ error: `No game with ID ${req.params.id}` });
    }
    res.send({ code: game.id });
});
router.get("/", (_, res) => {
    const game = handler.create();
    res.send({
        code: game.id,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        ttl: Number.MAX_SAFE_INTEGER,
    });
});

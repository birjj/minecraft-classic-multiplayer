import express from "express";
import ws from "ws";
import { randomString } from "../utils";

const db: { [id: string]: Game } = {};
class Game {
    id: string;
    createdAt = Date.now();
    updatedAt = Date.now();

    sockets: ws[] = [];

    constructor(id: string) {
        this.id = id;
    }

    addSocket(socket: ws) {
        console.log(
            "Adding socket to",
            this.sockets.length,
            "others in",
            this.id
        );
        this.sockets.push(socket);
        socket.on("close", () => {
            const idx = this.sockets.indexOf(socket);
            this.sockets.splice(idx, 1);
        });
    }
    broadcast(message: ws.Data, sender: ws) {
        console.log("Broadcasting", message, "on", this.id);
        this.sockets.forEach((socket) => {
            if (socket === sender) {
                return;
            }
            socket.send(message);
        });
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

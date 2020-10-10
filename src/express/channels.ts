import express from "express";
import url from "url";
import ws from "ws";
import { randomString } from "../utils";

// Channels are used to group players that want to communicate together
const db: { [id: string]: Channel } = {};
export default db;
class Channel {
    id: string;
    hostID = randomString(8);

    constructor(id: string) {
        this.id = id;
    }
}

// WS
export const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", (socket, req) => {
    const pathname = url.parse(req.url).pathname;
    const idMatch = /\/v2\/(.+)/.exec(pathname);
    const id = idMatch ? idMatch[1] : "";

    console.log("Creating WS for", id);

    socket.on("message", (message) => {
        if (message !== "ping") {
            console.log(message);
        }
    });
});

// Express routes
export const router = express.Router();
router.get("/create-channel/:id", (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).send({ error: `Channel ID must be set` });
    }
    if (db[id]) {
        return res.status(403).send({ error: `Channel ${id} already exists` });
    }
    db[id] = new Channel(id);
    res.send({});
});
router.get("/get-signaling-token/:id/host", (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).send({ error: `Channel ID must be set` });
    }
    const channel = db[id];
    if (!channel) {
        return res.status(404).send({ error: `Channel ${id} doesn't exist` });
    }
    res.send({ v: channel.hostID });
});
router.get("/get-signaling-host/:id/host", (req, res) => {
    res.send({ v: "ws://localhost:9876" });
});

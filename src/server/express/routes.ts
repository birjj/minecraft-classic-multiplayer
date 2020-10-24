import gamesHandler, { router as gamesRouter } from "./games";
import { router as channelsRouter } from "./channels";
import express from "express";

const router = express.Router();

router.use("/game", gamesRouter);
router.use("/", channelsRouter);

router.get("/status", (req, res) => {
    const games = gamesHandler.getAll();
    const gamesStatus = Object.keys(games).reduce((status, id) => {
        const prefix = id.substr(5, 8);
        status[prefix] = {
            players: Object.keys(games[id].sockets).length,
            updatedAt: games[id].updatedAt,
        };
        return status;
    }, {} as { [k: string]: { players: number; updatedAt: number } });

    res.send({ games: gamesStatus });
});

export default router;

import { router as gamesRouter } from "./games";
import { router as channelsRouter } from "./channels";
import express from "express";

const router = express.Router();

router.use("/game", gamesRouter);
router.use("/", channelsRouter);

export default router;

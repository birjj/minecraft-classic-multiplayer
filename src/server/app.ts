import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";

import routes from "./express/routes";
import { wsServer } from "./express/channels";
import { log } from "../log";

const app = express();

// Add basic middleware
app.use(morgan("tiny"));
app.use(bodyParser.urlencoded({ extended: false }));

// Allow CORS
app.use((_, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    next();
});

// Setup routes
app.use(routes);

// Handle 404
app.use((req, res, next) => {
    if (!res.writableEnded) {
        res.status(404).send({ error: `Unknown route ${req.originalUrl}` });
    }
    next();
});

const port = process.env.PORT || 9876;
const server = app.listen(port);
server.on("upgrade", (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (socket) => {
        wsServer.emit("connection", socket, request);
    });
});
log(`Listening on ${port}`);

import yargs from "yargs/yargs";
import { resolve as resolvePath, dirname } from "path";
import { constants as FS } from "fs";
import { promises as fs } from "fs";
import PeerClient from "./client";
import Connection from "./communication/connection";
import { codeFromURL } from "../utils";

const argv = yargs(process.argv.slice(2))
    .command("$0 [file] [url]", "Host a game of Minecraft Classic", (yargs) => {
        yargs
            .positional("file", {
                describe: "Name of world data in storage folder",
                default: "world",
            })
            .positional("url", {
                describe: "URL of game to copy world from",
            });
    })
    .option("server", {
        default: "http://localhost:9876",
        describe: "Address of web server used finding peers",
    })
    .option("player-limit", {
        default: 10,
        describe: "Maximum number of players that can join at a time",
        type: "number",
    })
    .option("storage", {
        default: "./worlds",
        describe: "Directory to store world data in",
        coerce: resolvePath,
    })
    .help().argv;

type Args = typeof argv & { file: string; url?: string };
(async (args: Args) => {
    const worldPath = resolvePath(args.storage, args.file);
    const worldExists = await fs
        .stat(worldPath)
        .then((stat) => stat.size > 0)
        .catch((_) => false);

    // exit if we would overwrite an existing world file
    if (args.url && worldExists) {
        console.error(
            `World file would be overwritten. Delete ${worldPath} and try again`
        );
        process.exit(1);
    }

    // make sure we have the directory for our world file
    if (!worldExists) {
        await fs.mkdir(dirname(worldPath), { recursive: true });
    }

    // open the file and start working
    let file: fs.FileHandle;
    try {
        file = await fs.open(worldPath, FS.O_RDWR | FS.O_CREAT);
        const connection = new Connection(args.server);
        const code = args.url ? codeFromURL(args.url) : "host";
        connection.connect(code);
        if (args.url) {
            const client = new PeerClient(connection);
            const world = await client.fetchWorld();
            console.log("Got world", world.getChanges().length);
        }
    } finally {
        file?.close();
    }
})(argv as Args).catch((e) => {
    console.error("Error while executing:");
    console.error(e);
    process.exit(1);
});

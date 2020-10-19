import yargs from "yargs/yargs";
import { resolve as resolvePath } from "path";
import { constants as FS } from "fs";
import fs from "fs/promises";

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
        .access(worldPath, FS.F_OK)
        .then((_) => true)
        .catch((_) => false);

    // exit if we would overwrite an existing world file
    if (args.url && worldExists) {
        console.error(
            `World file would be overwritten. Delete ${worldPath} and try again`
        );
        process.exit(1);
    }

    // open the file and start working
    let file: fs.FileHandle;
    try {
        file = await fs.open(worldPath, FS.O_RDWR | FS.O_CREAT);
    } finally {
        file?.close();
    }
})(argv as Args).catch((e) => {
    console.error("Error while executing:");
    console.error(e);
    process.exit(1);
});

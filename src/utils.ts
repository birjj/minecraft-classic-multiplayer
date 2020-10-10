import { Server } from "connect";
import type { ServerResponse } from "http";

const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-";
export function randomString(length: number) {
    let outp = "";
    for (let i = 0; i < length; ++i) {
        outp += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return outp;
}

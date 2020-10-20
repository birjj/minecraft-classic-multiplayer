const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-";
export function randomString(length: number) {
    let outp = "";
    for (let i = 0; i < length; ++i) {
        outp += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return outp;
}

export function codeFromURL(url: string) {
    const parsed = new URL(url);
    return parsed.searchParams.get("join");
}

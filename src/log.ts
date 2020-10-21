enum LEVELS {
    error = 0,
    warn,
    log,
    silly,
}
const debugLevel =
    process.env.DBGLEVEL === undefined
        ? LEVELS.log
        : LEVELS[process.env.DBGLEVEL];

function logFactory(threshold, ...preargs) {
    if (threshold < debugLevel) {
        return () => {};
    }
    return function (...args) {
        console.log(...preargs, ...args);
    };
}

export const error = logFactory(LEVELS.error, "[error]");
export const warn = logFactory(LEVELS.warn, "[warn]");
export const log = logFactory(LEVELS.log, "[log]");
export const silly = logFactory(LEVELS.silly, "[silly]");

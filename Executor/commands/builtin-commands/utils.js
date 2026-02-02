const os = require('os');
const path = require('path');

const { RESET } = require('../../../color');

function normalizeIo(io = {}) {
    const writeStdout =
        typeof io.writeStdout === 'function'
            ? io.writeStdout
            : (chunk) => process.stdout.write(chunk);
    const writeStderr =
        typeof io.writeStderr === 'function'
            ? io.writeStderr
            : (chunk) => process.stderr.write(chunk);

    return { writeStdout, writeStderr };
}

function writeLine(write, line = '') {
    write(`${line}\n`);
}

function getEnvFromIo(io) {
    if (io && typeof io.env === 'object' && io.env !== null) return io.env;
    return process.env;
}

function isValidIdentifier(name) {
    return /^[A-Z_][A-Z0-9_]*$/.test(name);
}

function wrapColor(text, colorCode, enabled) {
    return enabled ? `${colorCode}${text}${RESET}` : text;
}

function expandHome(p, env = process.env) {
    if (!p.startsWith('~')) return p;
    const home = env.HOME || env.USERPROFILE || os.homedir();
    if (!home) return p;
    if (p === '~') return home;
    if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
    return p;
}

module.exports = { expandHome, normalizeIo, writeLine, getEnvFromIo, isValidIdentifier, wrapColor };

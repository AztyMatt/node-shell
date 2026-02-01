const os = require('os');
const path = require('path');

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

function expandHome(p) {
    if (!p.startsWith('~')) return p;
    const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
    if (!home) return p;
    if (p === '~') return home;
    if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
    return p;
}

module.exports = { expandHome, normalizeIo, writeLine };
const fs = require('fs');
const path = require('path');

const { expandHome, normalizeIo, writeLine } = require('./utils');

function parseTouchArgs(args) {
    const targets = [];
    const unknown = [];
    let parseFlags = true;

    for (const arg of args) {
        if (parseFlags && arg === '--') {
            parseFlags = false;
            continue;
        }

        if (parseFlags && arg.startsWith('-') && arg !== '-') {
            unknown.push(arg);
            continue;
        }

        targets.push(arg);
    }

    return { targets, unknown };
}

function resolveTarget(rawTarget, env) {
    return path.resolve(process.cwd(), expandHome(rawTarget, env));
}

function touch(args, io) {
    const { writeStderr } = normalizeIo(io);
    const env = io?.env || process.env;
    const { targets, unknown } = parseTouchArgs(args);

    if (unknown.length) {
        writeLine(writeStderr, `touch: invalid option(s): ${unknown.join(' ')}`);
        return 2;
    }

    if (!targets.length) {
        writeLine(writeStderr, 'touch: missing file operand');
        return 1;
    }

    const now = new Date();
    let exitCode = 0;

    for (const rawTarget of targets) {
        const resolved = resolveTarget(rawTarget, env);

        let stat = null;
        try {
            stat = fs.lstatSync(resolved);
        } catch {}

        try {
            if (stat && stat.isDirectory()) {
                fs.utimesSync(resolved, now, now);
                continue;
            }

            const fd = fs.openSync(resolved, 'a');
            fs.closeSync(fd);
            fs.utimesSync(resolved, now, now);
        } catch (err) {
            const msg = err?.code === 'ENOENT'
                ? `touch: cannot touch '${rawTarget}': No such file or directory`
                : err?.code === 'EACCES' || err?.code === 'EPERM'
                    ? `touch: cannot touch '${rawTarget}': Permission denied`
                    : err?.code === 'EISDIR'
                        ? `touch: cannot touch '${rawTarget}': Is a directory`
                        : `touch: cannot touch '${rawTarget}': ${err.message}`;
            writeLine(writeStderr, msg);
            exitCode = 1;
        }
    }

    return exitCode;
}

module.exports = { touch };

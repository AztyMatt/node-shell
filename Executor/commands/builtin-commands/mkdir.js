const fs = require('fs');
const path = require('path');

const { expandHome, normalizeIo, writeLine } = require('./utils');

function parseMkdirArgs(args) {
    const opts = { recursive: true };
    const targets = [];
    const unknown = [];
    let parseFlags = true;

    for (const arg of args) {
        if (parseFlags && arg === '--') {
            parseFlags = false;
            continue;
        }

        if (parseFlags && (arg === '-p' || arg === '--parents')) {
            opts.recursive = true;
            continue;
        }

        if (parseFlags && arg.startsWith('-') && arg !== '-') {
            unknown.push(arg);
            continue;
        }

        targets.push(arg);
    }

    return { opts, targets, unknown };
}

function resolveTarget(rawTarget) {
    return path.resolve(process.cwd(), expandHome(rawTarget));
}

function mkdir(args, io) {
    const { writeStderr } = normalizeIo(io);
    const { opts, targets, unknown } = parseMkdirArgs(args);

    if (unknown.length) {
        writeLine(writeStderr, `mkdir: invalid option(s): ${unknown.join(' ')}`);
        return 2;
    }

    if (!targets.length) {
        writeLine(writeStderr, 'mkdir: missing operand');
        return 1;
    }

    let exitCode = 0;
    for (const rawTarget of targets) {
        const resolved = resolveTarget(rawTarget);
        try {
            fs.mkdirSync(resolved, { recursive: opts.recursive });
        } catch (err) {
            const msg = err?.code === 'EACCES' || err?.code === 'EPERM'
                ? `mkdir: cannot create directory '${rawTarget}': Permission denied`
                : err?.code === 'EEXIST'
                    ? `mkdir: cannot create directory '${rawTarget}': File exists`
                    : err?.code === 'ENOENT'
                        ? `mkdir: cannot create directory '${rawTarget}': No such file or directory`
                        : `mkdir: cannot create directory '${rawTarget}': ${err.message}`;
            writeLine(writeStderr, msg);
            exitCode = 1;
        }
    }

    return exitCode;
}

module.exports = { mkdir };
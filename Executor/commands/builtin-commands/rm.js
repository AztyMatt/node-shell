const fs = require('fs');
const path = require('path');

const { expandHome, normalizeIo, writeLine } = require('./utils');

function parseRmArgs(args) {
    const opts = { recursive: true, force: true };
    const targets = [];
    const unknown = [];
    let parseFlags = true;

    for (const arg of args) {
        if (parseFlags && arg === '--') {
            parseFlags = false;
            continue;
        }

        if (parseFlags && arg.startsWith('--')) {
            if (arg === '--recursive') {
                opts.recursive = true;
                continue;
            }
            if (arg === '--force') {
                opts.force = true;
                continue;
            }
            unknown.push(arg);
            continue;
        }

        if (parseFlags && arg.startsWith('-') && arg !== '-') {
            for (const flag of arg.slice(1)) {
                if (flag === 'r' || flag === 'R') opts.recursive = true;
                else if (flag === 'f') opts.force = true;
                else unknown.push(`-${flag}`);
            }
            continue;
        }

        targets.push(arg);
    }

    return { opts, targets, unknown };
}

function resolveTarget(rawTarget) {
    return path.resolve(process.cwd(), expandHome(rawTarget));
}

function rm(args, io) {
    const { writeStderr } = normalizeIo(io);
    const { opts, targets, unknown } = parseRmArgs(args);

    if (unknown.length) {
        writeLine(writeStderr, `rm: invalid option(s): ${unknown.join(' ')}`);
        return 2;
    }

    if (!targets.length) {
        writeLine(writeStderr, 'rm: missing operand');
        return 1;
    }

    let exitCode = 0;
    for (const rawTarget of targets) {
        const resolved = resolveTarget(rawTarget);
        try {
            fs.rmSync(resolved, {
                recursive: opts.recursive,
                force: opts.force,
                maxRetries: 3,
                retryDelay: 100,
            });
        } catch (err) {
            const msg = err?.code === 'EACCES' || err?.code === 'EPERM'
                ? `rm: cannot remove '${rawTarget}': Permission denied`
                : `rm: cannot remove '${rawTarget}': ${err.message}`;
            writeLine(writeStderr, msg);
            exitCode = 1;
        }
    }

    return exitCode;
}

module.exports = { rm };
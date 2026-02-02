const { normalizeIo, writeLine, getEnvFromIo, isValidIdentifier } = require('./utils');
const { ensureEnvMeta } = require('../../session-env');

function unset(args, io) {
    const { writeStderr } = normalizeIo(io);
    const env = getEnvFromIo(io);
    const meta = ensureEnvMeta(env);

    if (!args.length) return 0;

    let exitCode = 0;
    for (const rawName of args) {
        const name = String(rawName ?? '').trim();
        if (!isValidIdentifier(name)) {
            writeLine(writeStderr, `unset: not a valid identifier: ${rawName}`);
            exitCode = 1;
            continue;
        }

        const existed = Object.prototype.hasOwnProperty.call(env, name);
        delete env[name];
        meta?.fromExport?.delete(name);

        if (existed) {
            const msg = `unset ${name}`;
            writeLine(writeStderr, msg);
        }
    }

    return exitCode;
}

module.exports = { unset };

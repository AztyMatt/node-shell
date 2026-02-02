const { normalizeIo, writeLine, getEnvFromIo, isValidIdentifier } = require('./utils');
const { ensureEnvMeta } = require('../../session-env');

function exportBuiltin(args, io) {
    const { writeStderr } = normalizeIo(io);
    const env = getEnvFromIo(io);
    const meta = ensureEnvMeta(env);

    if (!args.length) return 0;

    let exitCode = 0;

    for (const arg of args) {
        const eqIdx = arg.indexOf('=');
        const name = (eqIdx === -1 ? arg : arg.slice(0, eqIdx)).trim();

        if (!isValidIdentifier(name)) {
            writeLine(writeStderr, `export: not a valid identifier: ${arg}`);
            exitCode = 1;
            continue;
        }

        if (eqIdx === -1) {
            if (env[name] == null) env[name] = '';
            meta?.fromExport?.add(name);
            const msg = `export ${name}=${env[name]}`;
            writeLine(writeStderr, msg);
            continue;
        }

        const value = arg.slice(eqIdx + 1);
        env[name] = value;
        meta?.fromExport?.add(name);
        const msg = `export ${name}=${value}`;
        writeLine(writeStderr, msg);
    }

    return exitCode;
}

module.exports = { export: exportBuiltin };

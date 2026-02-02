const { normalizeIo, writeLine, getEnvFromIo, wrapColor } = require('./utils');
const { getEnvMeta } = require('../../session-env');
const { GREEN, LIGHT_GREEN } = require('../../../color');

function env(args, io) {
    const { writeStdout } = normalizeIo(io);
    const envObj = getEnvFromIo(io);
    const useColor = Boolean(io?.stdoutIsTty);
    const meta = getEnvMeta(envObj);

    const keys = Object.keys(envObj).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
        const value = envObj[key];
        const line = `${key}=${value == null ? '' : String(value)}`;
        if (useColor && meta?.fromExport?.has(key)) {
            writeLine(writeStdout, wrapColor(line, GREEN, true));
            continue;
        }
        if (useColor && meta?.fromDotEnv?.has(key)) {
            writeLine(writeStdout, wrapColor(line, LIGHT_GREEN, true));
            continue;
        }
        writeLine(writeStdout, line);
    }

    return 0;
}

module.exports = { env };

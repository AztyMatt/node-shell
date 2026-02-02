const os = require('os');
const path = require('path');
const { expandHome, normalizeIo, writeLine } = require('./utils');

function cd(args, io) {
    const { writeStderr } = normalizeIo(io);
    const rawTarget = args[0];
    const env = io?.env || process.env;

    let target;
    if (!rawTarget) {
        const home = env.HOME || os.homedir() || env.USERPROFILE;
        if (!home) {
            writeLine(writeStderr, 'cd: HOME not set');
            return 1;
        }
        target = home;
    } else {
        target = path.resolve(process.cwd(), expandHome(rawTarget, env));
    }

    try {
        process.chdir(target);
        return 0;
    } catch (err) {
        if (err?.code === 'ENOENT') {
            writeLine(writeStderr, `cd: no such file or directory: ${rawTarget || target}`);
            return 1;
        }
        if (err?.code === 'EACCES') {
            writeLine(writeStderr, `cd: permission denied: ${rawTarget || target}`);
            return 1;
        }
        if (err?.code === 'ENOTDIR') {
            writeLine(writeStderr, `cd: not a directory: ${rawTarget || target}`);
            return 1;
        }
        writeLine(writeStderr, `cd: ${err.message}`);
        return 1;
    }
}

module.exports = { cd };

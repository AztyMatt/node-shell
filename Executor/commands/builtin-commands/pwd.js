const { normalizeIo, writeLine } = require('./utils');

function pwd(args, io) {
    const { writeStdout } = normalizeIo(io);
    writeLine(writeStdout, process.cwd());
    return 0;
}

module.exports = { pwd };
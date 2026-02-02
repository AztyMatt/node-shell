const { normalizeIo, writeLine } = require('./utils');

function echo(args, io) {
    const { writeStdout } = normalizeIo(io);

    let newline = true;
    const parts = Array.isArray(args) ? [...args] : [];

    while (parts[0] === '-n') {
        newline = false;
        parts.shift();
    }

    const out = parts.map((p) => String(p ?? '')).join(' ');
    if (newline) writeLine(writeStdout, out);
    else writeStdout(out);
    return 0;
}

module.exports = { echo };


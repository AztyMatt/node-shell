const fs = require('fs');
const path = require('path');
const os = require('os');
const { HELP_TOPICS } = require('./help');

function completerFactory(COMMANDS) {
    return function completer(line) {
        if (line.startsWith('help ')) {
            const q = line.slice(5);
            const topics = Object.keys(HELP_TOPICS || {});
            const matches = topics.filter(t => t.startsWith(q));
            return [matches.length ? matches : topics, line];
        }

        if (
            line.startsWith('/') ||
            line.startsWith('./') ||
            line.startsWith('../') ||
            line.startsWith('~')
        ) {
            const home = os.homedir();
            const expanded = line.startsWith('~') ? path.join(home, line.slice(1)) : line;
            const dir = expanded.endsWith(path.sep) ? expanded : path.dirname(expanded);
            const base = expanded.endsWith(path.sep) ? '' : path.basename(expanded);

            try {
                const entries = fs
                    .readdirSync(dir, { withFileTypes: true })
                    .map(d => (d.isDirectory() ? d.name + path.sep : d.name))
                    .filter(name => name.startsWith(base));

                const matches = entries.map(name =>
                    (expanded.endsWith(path.sep)
                        ? expanded + name
                        : path.join(path.dirname(expanded), name)
                    ).replace(home, '~')
                );

                return [matches.length ? matches : entries, line];
            } catch {
                return [[], line];
            }
        }

        const first = line.split(/\s+/)[0];
        const matches = COMMANDS.filter(cmd => cmd.startsWith(first));
        return [matches.length ? matches : COMMANDS, line];
    };
}

module.exports = { completerFactory };
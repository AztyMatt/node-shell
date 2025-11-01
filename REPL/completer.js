const fs = require('fs');
const path = require('path');
const os = require('os');
const { HELP_TOPICS } = require('./help');

function isPathLike(token) {
    return (
        token.startsWith('/') ||
        token.startsWith('./') ||
        token.startsWith('../') ||
        token.startsWith('~')
    );
}

function completerFactory(COMMANDS) {
    const expandTilde = (p) =>
        p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;

    function buildFsSuggestions(rawToken) {
        const token = rawToken.replace(/\\/g, '/');
        const isDirLike = token.endsWith('/');
        const dirPosix = isDirLike ? token : path.posix.dirname(token);
        const base = isDirLike ? '' : path.posix.basename(token);

        let prefix;
        if (isDirLike) prefix = token;
        else if (dirPosix === '.') prefix = './';
        else if (dirPosix === '..') prefix = '../';
        else if (dirPosix.startsWith('~/')) prefix = dirPosix + '/';
        else if (dirPosix === '~') prefix = '~/';
        else prefix = dirPosix.endsWith('/') ? dirPosix : dirPosix + '/';

        const dirFs = path.resolve(expandTilde(dirPosix === '.' ? './' : dirPosix));
        const expanded = path.resolve(expandTilde(token));

        if (fs.existsSync(expanded) && fs.statSync(expanded).isFile()) {
            return { insert: [], display: [], isDirLike };
        }
        if (!fs.existsSync(dirFs) || !fs.statSync(dirFs).isDirectory())
            return { insert: [], display: [], isDirLike };

        const entries = fs
            .readdirSync(dirFs, { withFileTypes: true })
            .map((d) => (d.isDirectory() ? d.name + '/' : d.name))
            .sort();

        const filtered = entries.filter((n) =>
            n.toLowerCase().startsWith(base.toLowerCase())
        );

        const insert = filtered.map((name) =>
            (prefix + name).replace(/\/{2,}/g, '/')
        );
        const display = isDirLike ? filtered.slice() : insert.slice();

        return { insert, display, isDirLike };
    }

    return function completer(line) {
        const lastSpace = line.lastIndexOf(' ');
        const token = line.slice(lastSpace + 1);
        const hasArgs = lastSpace !== -1;

        if (line.startsWith('help ')) {
            const q = token;
            const topics = Object.keys(HELP_TOPICS || {});
            const hits = topics.filter((t) => t.startsWith(q));
            return [hits.length ? hits : topics, q];
        }

        if (isPathLike(token)) {
            try {
                const { insert, display, isDirLike } = buildFsSuggestions(token);
                if (insert.length === 0) return [[], ''];
                if (insert.length === 1) return [[insert[0]], token];
                return [isDirLike ? display : insert, token];
            } catch {
                return [[], ''];
            }
        }

        if (!hasArgs) {
            const hits = COMMANDS.filter((cmd) => cmd.startsWith(token));
            return [hits.length ? hits : COMMANDS, token];
        }

        return [[], ''];
    };
}

module.exports = { completerFactory };
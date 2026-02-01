const fs = require('fs');
const path = require('path');
const os = require('os');
const { HELP_TOPICS } = require('./help');

function isPathLike(token) {
    return (
        token.startsWith('/') ||
        token.startsWith('./') ||
        token.startsWith('../') ||
        token.startsWith('~') ||
        token.startsWith('.\\') ||
        token.startsWith('..\\') ||
        token.startsWith('\\\\') ||
        /[\\/]/.test(token) ||
        /^[A-Za-z]:/.test(token)
    );
}

function completerFactory(COMMANDS) {
    const PATH_ARG_COMMANDS = new Set(['cd', 'ls', 'mkdir', 'rm', 'touch']);

    function longestCommonPrefix(items) {
        if (!items.length) return '';
        let prefix = items[0];
        for (let i = 1; i < items.length; i++) {
            const item = items[i];
            let j = 0;
            while (j < prefix.length && j < item.length && prefix[j] === item[j]) j++;
            prefix = prefix.slice(0, j);
            if (!prefix) return '';
        }
        return prefix;
    }

    const expandTilde = (p) =>
        p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;

    function buildFsSuggestions(rawToken) {
        const token = rawToken.replace(/\\/g, '/');
        const isDirLike = token.endsWith('/');
        const dirPosix = isDirLike ? token : path.posix.dirname(token);
        const base = isDirLike ? '' : path.posix.basename(token);

        let prefix;
        if (isDirLike) prefix = token;
        else if (dirPosix === '.') prefix = token.startsWith('./') ? './' : '';
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
        const cmdName = line.trimStart().split(/\s+/)[0] || '';

        if (line.startsWith('help ')) {
            const q = token;
            const topics = Object.keys(HELP_TOPICS || {});
            const hits = topics.filter((t) => t.startsWith(q));
            const completions = hits.length ? hits : topics;
            if (completions.length === 1) return [[completions[0]], q];
            return [completions, longestCommonPrefix(completions)];
        }

        const shouldCompletePath =
            isPathLike(token) ||
            (hasArgs && PATH_ARG_COMMANDS.has(cmdName) && (token === '' || !token.startsWith('-')));

        if (shouldCompletePath) {
            try {
                const { insert } = buildFsSuggestions(token);
                if (insert.length === 0) return [[], ''];
                if (insert.length === 1) return [[insert[0]], token];
                return [insert, longestCommonPrefix(insert)];
            } catch {
                return [[], ''];
            }
        }

        if (!hasArgs) {
            const hits = COMMANDS.filter((cmd) => cmd.startsWith(token));
            const completions = hits.length ? hits : COMMANDS;
            if (completions.length === 1) return [[completions[0]], token];
            return [completions, longestCommonPrefix(completions)];
        }

        return [[], ''];
    };
}

module.exports = { completerFactory };
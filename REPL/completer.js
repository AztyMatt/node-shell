const fs = require('fs')
const path = require('path')
const os = require('os')
const { HELP_TOPICS } = require('./help')

function isPathLike(token) {
    return token.startsWith('/') ||
        token.startsWith('./') ||
        token.startsWith('../') ||
        token.startsWith('~')
}

function completerFactory(COMMANDS) {
    return function completer(line) {
        const lastSpace = line.lastIndexOf(' ')
        const token = line.slice(lastSpace + 1)
        const hasArgs = lastSpace !== -1

        if (line.startsWith('help ')) {
            const q = token
            const topics = Object.keys(HELP_TOPICS || {})
            const hits = topics.filter(t => t.startsWith(q))
            return [hits.length ? hits : topics, q]
        }

        if (isPathLike(token)) {
            const home = os.homedir()
            const expanded = token.startsWith('~') ? path.join(home, token.slice(1)) : token
            const dir = expanded.endsWith(path.sep) ? expanded : path.dirname(expanded)
            const base = expanded.endsWith(path.sep) ? '' : path.basename(expanded)

            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true })
                    .map(d => (d.isDirectory() ? d.name + path.sep : d.name))
                    .filter(name => name.startsWith(base))

                const suggestions = entries.map(name => {
                    const completed = expanded.endsWith(path.sep)
                        ? expanded + name
                        : path.join(path.dirname(expanded), name)
                    return token.startsWith('~') ? completed.replace(home, '~') : completed
                })

                return [suggestions.length ? suggestions : entries, token]
            } catch {
                return [[], token]
            }
        }

        if (!hasArgs) {
            const hits = COMMANDS.filter(cmd => cmd.startsWith(token))
            return [hits.length ? hits : COMMANDS, token]
        }

        return [[], token]
    }
}

module.exports = { completerFactory }

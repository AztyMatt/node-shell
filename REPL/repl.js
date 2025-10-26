const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const HISTORY_FILE = path.join(process.cwd(), './shell-history');
const COMMANDS = ['exit', 'help', 'clear'];
const { HELP_TOPICS, printHelp } = require('./help');

function completer(line) {
    if (line.startsWith('help ')) {
        const q = line.slice(5);
        const topics = Object.keys(HELP_TOPICS || {});
        const matches = topics.filter(t => t.startsWith(q));
        return [matches.length ? matches : topics, line];
    }

    if (line.startsWith('/') || line.startsWith('./') || line.startsWith('../') || line.startsWith('~')) {
        const home = os.homedir();
        const expanded = line.startsWith('~') ? path.join(home, line.slice(1)) : line;
        const dir = expanded.endsWith(path.sep) ? expanded : path.dirname(expanded);
        const base = expanded.endsWith(path.sep) ? '' : path.basename(expanded);

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
                .map(d => (d.isDirectory() ? d.name + path.sep : d.name))
                .filter(name => name.startsWith(base));

            const matches = entries.map(name =>
                (expanded.endsWith(path.sep) ? expanded + name : path.join(path.dirname(expanded), name))
                    .replace(os.homedir(), '~')
            );

            return [matches.length ? matches : entries, line];
        } catch {
            return [[], line];
        }
    }

    const first = line.split(/\s+/)[0];
    const matches = COMMANDS.filter(cmd => cmd.startsWith(first));
    return [matches.length ? matches : COMMANDS, line];
}

function startRepl() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer,
        historySize: 1000,
        prompt: 'node-shell> '
    });

    if (fs.existsSync(HISTORY_FILE)) {
        const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
        rl.history = lines.reverse();
    }

    console.log('Welcome to my node.js shell! Type "exit" to quit.');
    rl.prompt();

    rl.on('line', (line) => {
        const input = line.trim();
        if (input === '') {
            rl.prompt();
            return;
        }

        if (input === 'clear') {
            console.clear();
            rl.prompt();
            return;
        }

        if (input.startsWith('help')) {
            const parts = input.split(/\s+/).slice(1);
            printHelp(parts);
            rl.prompt();
            return;
        }

        if (line.startsWith('help ')) {
            const q = line.slice(5);
            const topics = Object.keys(HELP_TOPICS);
            const matches = topics.filter(t => t.startsWith(q));
            return [matches.length ? matches : topics, line];
        }

        if (input === 'exit') {
            rl.close();
            return;
        }

        fs.appendFileSync(HISTORY_FILE, input + '\n');

        console.log(`You typed: ${input}`);
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('Closing the shell...');
        process.exit(0);
    });
}

module.exports = startRepl;
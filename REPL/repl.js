const readline = require('readline');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { printHelp } = require('./help');
const { completerFactory } = require('./completer');
const HISTORY_FILE = path.resolve(__dirname, 'shell-history');
const COMMANDS = ['help', 'exit', 'clear', 'cd', 'pwd', 'ls', 'mkdir', 'touch', 'rm'];

const { parse } = require('../Command-Parser/parser');
const { execute } = require('../Executor/executor');

const { BOLD, ITALIC, GREEN, LIGHT_GREEN, RESET } = require('../color');
const MESSAGE = `
${LIGHT_GREEN}Welcome to my node.js shell !${RESET}
${ITALIC}${LIGHT_GREEN}Type "exit" to quit.${RESET}
`;

function formatCwdForPrompt() {
    try {
        const cwd = process.cwd();
        const homeDir = os.homedir();
        if (!homeDir) return cwd;
        if (cwd === homeDir) return '~';
        if (cwd.startsWith(homeDir + path.sep)) return `~${cwd.slice(homeDir.length)}`;
        return cwd;
    } catch {
        return '?';
    }
}

function getPrompt() {
    const cwd = formatCwdForPrompt();
    return `${BOLD}${GREEN}node-shell:${RESET}${BOLD}${LIGHT_GREEN}${cwd}${RESET}${BOLD}${GREEN}>${RESET} `;
}

function startRepl() {
    const completer = completerFactory(COMMANDS);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer,
        historySize: 1000,
    });

    const previousKeySymbol = Object.getOwnPropertySymbols(rl).find(
        (s) => s.description === '_previousKey'
    );
    if (previousKeySymbol && rl.input?.prependListener) {
        rl.input.prependListener('keypress', (_str, key) => {
            if (key?.name === 'tab') {
                rl[previousKeySymbol] = { name: 'tab' };
            }
        });
    }

    function prompt() {
        rl.setPrompt(getPrompt());
        rl.prompt();
    }

    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
            rl.history = lines.reverse();
        }
    } catch (err) {
        console.error('Failed to load history:', err);
    }

    console.log(MESSAGE);
    prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (input !== '') {
            try {
                fs.appendFileSync(HISTORY_FILE, input + '\n');
            } catch (err) {
                console.error('Failed to write history:', err);
            }
        }

        if (input === '') {
            prompt();
            return;
        }

        if (input === 'clear') {
            console.clear();
            prompt();
            return;
        }

        if (input.startsWith('help')) {
            const parts = input.split(/\s+/).slice(1);
            printHelp(parts);
            prompt();
            return;
        }

        if (input === 'exit') {
            rl.close();
            return;
        }

        try {
            const ast = parse(input);
            rl.pause();
            await execute(ast);
            rl.resume();
        } catch (err) {
            console.error('Shell Error:', err.message);
        }
        prompt();
    });

    rl.on('close', () => {
        console.log('Closing the shell...');
        process.exit(0);
    });
}

module.exports = { startRepl };

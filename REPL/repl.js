const readline = require('readline');
const fs = require('fs');
const path = require('path');

const { printHelp } = require('./help');
const { completerFactory } = require('./completer');
const HISTORY_FILE = path.resolve(__dirname, 'shell-history');
const COMMANDS = ['help', 'exit', 'clear'];

const { parse } = require('../Command-Parser/parser');
const { execute } = require('../Executor/executor');

const { BOLD, ITALIC, GREEN, LIGHT_GREEN, RESET } = require('../color');
const PROMPT = `${BOLD}${GREEN}node-shell>${RESET} `;
const MESSAGE = `
${LIGHT_GREEN}Welcome to my node.js shell !${RESET}
${ITALIC}${LIGHT_GREEN}Type "exit" to quit.${RESET}
`;

function startRepl() {
    const completer = completerFactory(COMMANDS);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer,
        historySize: 1000,
        prompt: PROMPT
    });

    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
            rl.history = lines.reverse();
        }
    } catch (err) {
        console.error('Failed to load history:', err);
    }

    console.log(MESSAGE);
    rl.prompt();

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

        if (input === 'exit') {
            rl.close();
            return;
        }

        try {
            const ast = parse(input);
            // Suspension temporaire des entrées utilisateur
            rl.pause();
            // Exécution de la commande (interne ou externe)
            await execute(ast);
            // Reprise du prompt
            rl.resume();
        } catch (err) {
            console.error('Shell Error:', err.message);
        }
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('Closing the shell...');
        process.exit(0);
    });
}

module.exports = { startRepl };
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const { printHelp } = require('./help');
const { completerFactory } = require('./completer');
const HISTORY_FILE = path.resolve(__dirname, 'shell-history');
const COMMANDS = ['help', 'exit', 'clear'];
const completer = completerFactory(COMMANDS);

function startRepl() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer,
        historySize: 1000,
        prompt: 'node-shell> '
    });

    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const lines = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
            rl.history = lines.reverse();
        }
    } catch (err) {
        console.error('Failed to load history:', err);
    }
    console.log('Welcome to my node.js shell! Type "exit" to quit.');
    rl.prompt();

    rl.on('line', (line) => {
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

        console.log(`You typed: ${input}`);
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('Closing the shell...');
        process.exit(0);
    });
}

module.exports = { startRepl };
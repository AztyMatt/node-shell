const { ITALIC, LIGHT_GREEN, RESET } = require('../color');
const HELP_TIP = `${ITALIC}(Type "help " (with a space) and press Tab to list all available help topics.)${RESET}`;

function formatDoc(title, sections) {
    const parts = [`${title}\n`];

    for (const section of sections) {
        if (!section) continue;
        const heading = String(section.heading ?? '').trim();
        const lines = Array.isArray(section.lines) ? section.lines.filter(Boolean) : [];
        if (!heading || lines.length === 0) continue;

        parts.push(`\n${heading}\n`);
        for (const line of lines) parts.push(`    ${line}\n`);
    }

    return `\n${parts.join('')}`;
}

function formatTwoColumnRows(rows, leftWidth) {
    const width = Math.max(0, leftWidth | 0);
    return rows.map(([left, right]) => `${String(left).padEnd(width)}  ${right}`);
}

const HELP_TOPICS = {
    general: formatDoc('help — Overview', [
        {
            heading: 'USAGE',
            lines: [
                'help',
                'help <topic|command>',
                'help \'<topic|command>\'',
                'help "<topic|command>"',
            ],
        },
        {
            heading: 'COMMANDS',
            lines: formatTwoColumnRows(
                [
                    ['cd', 'Change current directory'],
                    ['pwd', 'Print working directory'],
                    ['ls', 'List directory contents'],
                    ['mkdir', 'Create directories (recursive)'],
                    ['touch', 'Create file / update timestamp'],
                    ['rm', 'Remove files/directories (recursive)'],
                    ['echo', 'Print arguments to stdout'],
                    ['export', 'Set environment variables for this shell session'],
                    ['env', 'Print the current environment variables'],
                    ['unset', 'Remove environment variables from this shell session'],
                    ['clear', 'Clear the terminal screen'],
                    ['exit', 'Exit the shell'],
                ],
                10
            ),
        },
        {
            heading: 'SHORTCUTS',
            lines: formatTwoColumnRows(
                [
                    ['↑ / ↓', 'Navigate through command history'],
                    ['Tab', 'Trigger autocompletion (commands or paths)'],
                    ['Ctrl+C', 'Interrupt / close'],
                    ['Ctrl+D', 'End of input (EOF) / close'],
                ],
                8
            ),
        },
        {
            heading: 'TOPICS',
            lines: formatTwoColumnRows(
                [
                    ['history', 'Persistent command history'],
                    ['completion', 'Autocompletion (commands + filesystem)'],
                    ['signals', 'Handling Ctrl+C / Ctrl+D'],
                    ['builtins', 'Built-in commands summary'],
                ],
                10
            ),
        },
        {
            heading: 'EXAMPLES',
            lines: ['help history', 'help ls', 'help \'export\''],
        },
        {
            heading: 'NOTES',
            lines: [HELP_TIP],
        },
    ]),

    history: formatDoc('history — Persistent command history', [
        {
            heading: 'DESCRIPTION',
            lines: [
                'Each executed command is appended to the .shell-history file.',
                'On startup, this file is reloaded so previous commands can be accessed using ↑ / ↓.',
            ],
        },
    ]),

    completion: formatDoc('completion — Command & path autocompletion', [
        {
            heading: 'DESCRIPTION',
            lines: [
                'Press Tab after typing a few letters to auto-complete internal commands (e.g. "ex" → "exit").',
                'Typing ./, ../, /, or ~ triggers filesystem-based completion for files and directories.',
                'Directories are suffixed with a trailing slash.',
                'External binaries in PATH are not included — completion is limited to internal commands and local paths.',
            ],
        },
    ]),

    signals: formatDoc('signals — Interrupts & session closing', [
        {
            heading: 'DESCRIPTION',
            lines: [
                'Ctrl+C sends SIGINT. readline closes the interface and triggers the "close" event.',
                'Ctrl+D sends EOF (End Of File). readline interprets it as a request to close the session.',
                'Both result in the same behavior: the shell exits cleanly and calls process.exit(0).',
            ],
        },
    ]),

    builtins: formatDoc('builtins — Built-in commands', [
        {
            heading: 'COMMANDS',
            lines: formatTwoColumnRows(
                [
                    ['cd', 'Change current directory'],
                    ['pwd', 'Print working directory'],
                    ['ls', 'List directory contents (options: -a/--all, -l, -h, -R, -t, -S, -F)'],
                    ['mkdir', 'Create directories (recursive)'],
                    ['touch', 'Create file / update timestamp'],
                    ['rm', 'Remove files/directories (recursive)'],
                    ['echo', 'Print arguments to stdout'],
                    ['export', 'Set environment variables for this shell session'],
                    ['env', 'Print the current environment variables'],
                    ['unset', 'Remove environment variables from this shell session'],
                    ['clear', 'Clear the terminal screen'],
                    ['exit', 'Exit the shell'],
                    ['help', 'Display help for a topic or command'],
                ],
                10
            ),
        },
    ]),

    cd: formatDoc('cd — Change directory', [
        { heading: 'USAGE', lines: ['cd <path>', 'cd  (go to $HOME)'] },
        { heading: 'NOTES', lines: ['~ is expanded to your home directory.'] },
    ]),

    pwd: formatDoc('pwd — Print working directory', [
        { heading: 'USAGE', lines: ['pwd'] },
    ]),

    ls: formatDoc('ls — List directory contents', [
        { heading: 'USAGE', lines: ['ls [options] [path...]'] },
        {
            heading: 'OPTIONS',
            lines: [
                '-a, --all   Include hidden files',
                '-l          Long format',
                '-h          Human-readable sizes (with -l)',
                '-R          Recursive',
                '-t          Sort by time',
                '-S          Sort by size',
                '-F          Add suffixes (/ for dirs, * for executables)',
            ],
        },
    ]),

    mkdir: formatDoc('mkdir — Create directories', [
        { heading: 'USAGE', lines: ['mkdir <dir...>'] },
        { heading: 'NOTES', lines: ['Creates intermediate directories when needed.'] },
    ]),

    touch: formatDoc('touch — Create files / update timestamps', [
        { heading: 'USAGE', lines: ['touch <file...>'] },
    ]),

    rm: formatDoc('rm — Remove files or directories', [
        { heading: 'USAGE', lines: ['rm <path...>'] },
        { heading: 'NOTES', lines: ['Directories are removed recursively.'] },
    ]),

    echo: formatDoc('echo — Print arguments', [
        { heading: 'USAGE', lines: ['echo [args...]', 'echo -n [args...]  (no trailing newline)'] },
    ]),

    export: formatDoc('export — Set environment variables (session only)', [
        { heading: 'USAGE', lines: ['export NAME=VALUE [NAME=VALUE...]', 'export NAME  (sets to empty string if unset)'] },
        { heading: 'NOTES', lines: ['Variable names must match: [A-Z_][A-Z0-9_]*'] },
    ]),

    unset: formatDoc('unset — Remove environment variables (session only)', [
        { heading: 'USAGE', lines: ['unset NAME [NAME...]'] },
        { heading: 'NOTES', lines: ['Variable names must match: [A-Z_][A-Z0-9_]*'] },
    ]),

    env: formatDoc('env — Print environment variables', [
        { heading: 'USAGE', lines: ['env'] },
        {
            heading: 'COLOR',
            lines: [
                'Variables loaded from .env are in light green.',
                'Variables set via export are in green.',
            ],
        },
    ]),

    clear: formatDoc('clear — Clear the terminal screen', [
        { heading: 'USAGE', lines: ['clear'] },
    ]),

    exit: formatDoc('exit — Quit the shell', [
        { heading: 'USAGE', lines: ['exit'] },
    ]),

    help: formatDoc('help — Show help', [
        { heading: 'USAGE', lines: ['help', 'help <topic|command>', 'help \'<topic|command>\'', 'help "<topic|command>"'] },
        { heading: 'EXAMPLES', lines: ['help history', 'help ls', 'help \'export\''] },
    ]),
};

function normalizeTopic(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '\'' && last === '\'') || (first === '"' && last === '"')) {
        return s.slice(1, -1).trim();
    }
    return s;
}

function printHelp(args = []) {
    const requested = normalizeTopic(args[0] || 'general').toLowerCase();
    const topic = HELP_TOPICS[requested] ? requested : 'general';
    const text = HELP_TOPICS[topic];
    console.log(`${LIGHT_GREEN}${text}${RESET}`);
}

module.exports = { HELP_TOPICS, printHelp };

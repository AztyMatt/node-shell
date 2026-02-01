const { ITALIC, LIGHT_GREEN, RESET } = require('../color');
const HELP = `${ITALIC}(Type "help " (with a space) and press Tab to list all available help topics.)${RESET}`;

const HELP_TOPICS = {
    general: `
USAGE
    help                Show this help message
    help <topic>        Show detailed help for a specific topic (e.g. help history)

BUILT-IN COMMANDS
    cd                  Change current directory
    pwd                 Print current directory
    exit                Exit the shell
    clear               Clear the terminal screen
    help                Show this help message
    ls                  List directory contents
    mkdir               Create directories (recursive)
    touch               Create file / update timestamp
    rm                  Remove files/directories (recursive)

KEYBOARD SHORTCUTS
    ↑ / ↓               Navigate through command history
    Tab                 Trigger autocompletion (commands or paths)
    Ctrl+C              Interrupt / close
    Ctrl+D              End of input (EOF) / close

TOPICS
    history             Persistent command history
    completion          Autocompletion (commands + filesystem)
    signals             Handling Ctrl+C / Ctrl+D
    builtins            Built-in commands

EXAMPLES
    help history
    help completion

${HELP}
`,

    history: `
HISTORY — Persistent command history

• Each executed command is appended to the .shell-history file.
• On startup, this file is reloaded so previous commands can be accessed using ↑ / ↓.
`,

    completion: `
COMPLETION — Command & path autocompletion

• Press Tab after typing a few letters to auto-complete internal commands (e.g. "ex" → "exit").
• Typing ./, ../, /, or ~ triggers filesystem-based completion for files and directories.
• Directories are suffixed with a trailing slash.
• External binaries in PATH are not included — completion is limited to internal commands and local paths.
`,

    signals: `
SIGNALS — Interrupts & session closing

• Ctrl+C sends the SIGINT signal, intercepted by readline, which closes the interface and triggers the 'close' event.
• Ctrl+D sends the EOF (End Of File) character, signaling the end of input. readline interprets this as a request to close the session.
• Both result in the same behavior: the shell exits cleanly and calls process.exit(0).
`,

    builtins: `
BUILT-INS — Internal commands

• cd      Change current directory.
• pwd     Print current directory.
• exit    Quit the shell immediately.
• clear   Clear the terminal screen.
• help    Display this help or topic-specific help (help <topic>).
• ls      List directory contents.
          Options: -a/--all, -l, -h, -R, -t, -S, -F
• mkdir   Create directory(ies) (recursive).
• touch   Create file(s) or update timestamps.
• rm      Remove file(s) or directory(ies) (recursive).
`
};

function printHelp(args = []) {
    const topic = (args[0] || 'general').toLowerCase();
    const text = HELP_TOPICS[topic] || HELP_TOPICS.general;
    console.log(`${LIGHT_GREEN}${text}${RESET}`);
}

module.exports = { HELP_TOPICS, printHelp };

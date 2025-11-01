const { TOKEN } = require('./tokens');
const { lexer } = require('./lexer');
const {
    Pipeline, Command, Word, TextPart, VarPart
} = require('./ast');

function* scanVarParts(str, startIdx) {
    if (str[startIdx] !== '$') return;
    let i = startIdx + 1;

    if (str[i] === '{') {
        i++;
        const begin = i;
        while (i < str.length && str[i] !== '}') i++;
        const name = str.slice(begin, i);
        if (i < str.length && str[i] === '}') i++;
        yield { kind: 'var', name, len: i - startIdx };
        return;
    }

    const begin = i;
    while (i < str.length && /[A-Za-z0-9_]/.test(str[i])) i++;
    const name = str.slice(begin, i);
    if (name) yield { kind: 'var', name, len: i - startIdx };
}

function scanSubCommand(str, startIdx) {
    if (!(str[startIdx] === '$' && str[startIdx + 1] === '(')) return null;
    let i = startIdx + 2;
    let depth = 1;
    while (i < str.length && depth > 0) {
        if (str[i] === '$' && str[i + 1] === '(') { depth++; i += 2; continue; }
        if (str[i] === ')') { depth--; i++; continue; }
        i++;
    }
    const inner = str.slice(startIdx + 2, i - 1);
    return { content: inner, len: i - startIdx };
}

function parseWordParts(str) {
    const parts = [];
    let i = 0;

    while (i < str.length) {
        const sub = scanSubCommand(str, i);
        if (sub) {
            const innerAst = parse(sub.content);
            parts.push(innerAst);
            i += sub.len;
            continue;
        }

        let varPart = null;
        for (const candidate of scanVarParts(str, i)) {
            varPart = candidate; break;
        }
        if (varPart) {
            parts.push(VarPart(varPart.name));
            i += varPart.len;
            continue;
        }

        let j = i;
        while (j < str.length) {
            if (str[j] === '$') break;
            j++;
        }
        const chunk = str.slice(i, j);
        if (chunk) parts.push(TextPart(chunk));
        i = j;
    }

    return Word(parts);
}

function parseTokens(tokens) {
    const pipeline = Pipeline([]);
    let current = Command(null, [], {});

    const flushCommand = () => {
        if (current.name) pipeline.commands.push(current);
        current = Command(null, [], {});
    };

    const pushArg = (wordToken) => {
        const word = parseWordParts(wordToken.value);
        if (!current.name) {
            const asString = word.parts.map(p => p.type === 'TEXT' ? p.value : '').join('');
            current.name = asString;
        } else {
            current.args.push(word);
        }
    };

    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];

        switch (t.type) {
            case TOKEN.WORD:
                pushArg(t);
                i++;
                break;

            case TOKEN.PIPE:
                flushCommand();
                i++;
                break;

            case TOKEN.REDIR_OUT: {
                const next = tokens[i + 1];
                if (!next || next.type !== TOKEN.WORD) throw new Error('Expected target after ">"');
                const word = parseWordParts(next.value);
                current.redirections.stdout = { target: word, append: false };
                i += 2;
                break;
            }

            case TOKEN.REDIR_OUT_APPEND: {
                const next = tokens[i + 1];
                if (!next || next.type !== TOKEN.WORD) throw new Error('Expected target after ">>"');
                const word = parseWordParts(next.value);
                current.redirections.stdout = { target: word, append: true };
                i += 2;
                break;
            }

            case TOKEN.REDIR_IN: {
                const next = tokens[i + 1];
                if (!next || next.type !== TOKEN.WORD) throw new Error('Expected target after "<"');
                const word = parseWordParts(next.value);
                current.redirections.stdin = { target: word };
                i += 2;
                break;
            }

            case TOKEN.REDIR_FD: {
                const next = tokens[i + 1];
                if (!next || next.type !== TOKEN.WORD) throw new Error(`Expected target after "${t.fd}${t.op}"`);
                const word = parseWordParts(next.value);
                const append = (t.op === '>>');
                if (t.fd === '2') {
                    current.redirections.stderr = { target: word, append };
                } else if (t.fd === '1') {
                    current.redirections.stdout = { target: word, append };
                } else if (t.fd === '0') {
                    current.redirections.stdin = { target: word };
                } else {
                    current.redirections[`fd${t.fd}`] = { target: word, append };
                }
                i += 2;
                break;
            }

            default:
                throw new Error(`Unknown token type: ${t.type}`);
        }
    }

    flushCommand();
    return pipeline;
}

function parse(input) {
    const tokens = lexer(input);
    return parseTokens(tokens);
}

module.exports = { parse };

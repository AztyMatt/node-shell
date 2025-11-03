const { TOKEN, OPERATORS } = require('./tokens');

function isWhitespace(ch) {
    return ch === ' ' || ch === '\t';
}

function isDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function matchOperator(input, i) {
    for (const { sym, type } of OPERATORS) {
        if (input.startsWith(sym, i)) {
            return { type, len: sym.length };
        }
    }
    return null;
}

function matchFdRedirection(input, i) {
    let j = i;
    if (!isDigit(input[j])) return null;
    while (j < input.length && isDigit(input[j])) j++;
    if (input.startsWith('>>', j)) return { fd: input.slice(i, j), op: '>>', len: (j - i) + 2 };
    if (input[j] === '>') return { fd: input.slice(i, j), op: '>', len: (j - i) + 1 };
    return null;
}

function lexer(input) {
    const tokens = [];
    let i = 0;

    const pushWord = (buf) => {
        if (buf.length > 0) tokens.push({ type: TOKEN.WORD, value: buf.join('') });
    };

    while (i < input.length) {
        if (isWhitespace(input[i])) { i++; continue; }

        const fdMatch = matchFdRedirection(input, i);
        if (fdMatch) {
            tokens.push({ type: TOKEN.REDIR_FD, fd: fdMatch.fd, op: fdMatch.op });
            i += fdMatch.len;
            continue;
        }

        const op = matchOperator(input, i);
        if (op) {
            tokens.push({ type: op.type });
            i += op.len;
            continue;
        }

        const buf = [];
        let inSingle = false;
        let inDouble = false;

        while (i < input.length) {
            const ch = input[i];

            if (!inSingle && !inDouble) {
                if (isWhitespace(ch)) break;
                if (matchFdRedirection(input, i) || matchOperator(input, i)) break;
            }

            if (!inSingle && ch === '\\') {
                if (i + 1 < input.length) {
                    buf.push(input[i + 1]);
                    i += 2;
                    continue;
                } else {
                    i++;
                    continue;
                }
            }

            if (!inDouble && ch === '\'') {
                inSingle = !inSingle;
                i++;
                continue;
            }

            if (!inSingle && ch === '"') {
                inDouble = !inDouble;
                i++;
                continue;
            }

            if (inDouble && ch === '\\' && i + 1 < input.length) {
                const next = input[i + 1];
                if (next === '"' || next === '$' || next === '\\') {
                    buf.push(next);
                    i += 2;
                    continue;
                }
            }

            buf.push(ch);
            i++;
        }

        pushWord(buf);
    }

    return tokens;
}

module.exports = { lexer };
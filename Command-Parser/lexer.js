const { TOKEN, OPERATORS, LITERAL_DOLLAR } = require('./tokens');

function isWhitespace(ch) {
    return ch === ' ' || ch === '\t';
}

function isDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function scanCommandSubstitution(input, startIdx) {
    if (!(input[startIdx] === '$' && input[startIdx + 1] === '(')) return null;

    let i = startIdx + 2;
    let depth = 1;
    let inSingle = false;
    let inDouble = false;

    while (i < input.length && depth > 0) {
        const ch = input[i];

        if (!inSingle && ch === '\\') {
            i += (i + 1 < input.length) ? 2 : 1;
            continue;
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

        if (!inSingle && !inDouble && ch === '$' && input[i + 1] === '(') {
            depth++;
            i += 2;
            continue;
        }

        if (!inSingle && !inDouble && ch === ')') {
            depth--;
            i++;
            continue;
        }

        i++;
    }

    return { value: input.slice(startIdx, i), len: i - startIdx };
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
            if (!inSingle && input[i] === '$' && input[i + 1] === '(') {
                const sub = scanCommandSubstitution(input, i);
                if (sub) {
                    buf.push(...sub.value);
                    i += sub.len;
                    continue;
                }
            }

            const ch = input[i];

            if (!inSingle && !inDouble) {
                if (isWhitespace(ch)) break;
                if (matchFdRedirection(input, i) || matchOperator(input, i)) break;
            }

            if (!inSingle && ch === '\\') {
                if (i + 1 < input.length) {
                    const escaped = input[i + 1];
                    buf.push(escaped === '$' ? LITERAL_DOLLAR : escaped);
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

            if (inSingle && ch === '$') {
                buf.push(LITERAL_DOLLAR);
                i++;
                continue;
            }

            buf.push(ch);
            i++;
        }

        pushWord(buf);
    }

    return tokens;
}

module.exports = { lexer };

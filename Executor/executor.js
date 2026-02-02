const fs = require('fs');
const { spawn } = require('child_process');
const { BUILTINS } = require('./commands/builtin-commands');

function safeCloseFd(fd) {
    if (typeof fd !== 'number') return;
    if (fd <= 2) return;
    try { fs.closeSync(fd); } catch {}
}

function openWriteFd(filePath, append) {
    const flags = append ? 'a' : 'w';
    const mode = 0o666;
    return fs.openSync(filePath, flags, mode);
}

function normalizeCommandSubstitutionStdout(stdout) {
    return String(stdout ?? '').replace(/[\r\n]+$/g, '');
}

async function expandWordToString(word, ctx) {
    if (word == null) return '';
    if (typeof word === 'string') return word;
    if (word.type !== 'Word' || !Array.isArray(word.parts)) return '';

    const { env } = ctx;
    let out = '';

    for (const part of word.parts) {
        if (!part || typeof part !== 'object') continue;

        if (part.type === 'TEXT') {
            out += part.value ?? '';
            continue;
        }

        if (part.type === 'VAR') {
            const val = env?.[part.name];
            out += val == null ? '' : String(val);
            continue;
        }

        if (part.type === 'SUBCMD') {
            const { stdout } = await executePipelineAst(part.pipeline, {
                env,
                captureStdout: true,
            });
            out += normalizeCommandSubstitutionStdout(stdout);
            continue;
        }
    }

    return out;
}

async function expandCommandAst(cmdAst, ctx) {
    const name = await expandWordToString(cmdAst.name, ctx);
    const args = [];
    for (const word of (cmdAst.args || [])) args.push(await expandWordToString(word, ctx));

    const redirections = {};
    const redirs = cmdAst.redirections || {};

    if (redirs.stdin?.target) {
        redirections.stdin = { target: await expandWordToString(redirs.stdin.target, ctx) };
    }
    if (redirs.stdout?.target) {
        redirections.stdout = {
            target: await expandWordToString(redirs.stdout.target, ctx),
            append: Boolean(redirs.stdout.append),
        };
    }
    if (redirs.stderr?.target) {
        redirections.stderr = {
            target: await expandWordToString(redirs.stderr.target, ctx),
            append: Boolean(redirs.stderr.append),
        };
    }

    return { name, args, redirections };
}

function createBufferWriter(chunks) {
    return (chunk) => {
        if (chunk == null) return;
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    };
}

function createWriteFn(target, fallbackStream) {
    if (typeof target === 'number') {
        return (chunk) => {
            fs.writeSync(target, chunk);
        };
    }
    if (target && typeof target.write === 'function') {
        return (chunk) => {
            target.write(chunk);
        };
    }
    return (chunk) => {
        fallbackStream.write(chunk);
    };
}

async function executeBuiltin(cmdName, args, execOptions) {
    const env = execOptions.env || process.env;
    const captureStdout = Boolean(execOptions.captureStdout);

    const fdsToClose = [];

    let stdoutTarget = 'inherit';
    let stderrTarget = 'inherit';

    try {
        if (execOptions.redirections?.stdout?.target) {
            const fd = openWriteFd(execOptions.redirections.stdout.target, execOptions.redirections.stdout.append);
            fdsToClose.push(fd);
            stdoutTarget = fd;
        } else if (captureStdout) {
            stdoutTarget = 'capture';
        }

        if (execOptions.redirections?.stderr?.target) {
            const fd = openWriteFd(execOptions.redirections.stderr.target, execOptions.redirections.stderr.append);
            fdsToClose.push(fd);
            stderrTarget = fd;
        }
    } catch (err) {
        console.error(err.message);
        fdsToClose.forEach(safeCloseFd);
        return { code: 1, stdout: '' };
    }

    const stdoutChunks = [];
    const io = {
        env,
        writeStdout:
            stdoutTarget === 'capture'
                ? createBufferWriter(stdoutChunks)
                : createWriteFn(stdoutTarget, process.stdout),
        writeStderr: createWriteFn(stderrTarget, process.stderr),
        stdoutIsTty: stdoutTarget === 'inherit' && Boolean(process.stdout.isTTY),
        stderrIsTty: stderrTarget === 'inherit' && Boolean(process.stderr.isTTY),
    };

    const ret = BUILTINS[cmdName](args, io);
    fdsToClose.forEach(safeCloseFd);

    return {
        code: Number.isInteger(ret) ? ret : 0,
        stdout: stdoutTarget === 'capture' ? Buffer.concat(stdoutChunks).toString('utf8') : '',
    };
}

async function executeExternal(cmdName, args, execOptions) {
    const env = execOptions.env || process.env;
    const captureStdout = Boolean(execOptions.captureStdout);

    const fdsToClose = [];
    let stdinStdio = 'inherit';
    let stdoutStdio = 'inherit';
    let stderrStdio = 'inherit';

    const stdinData = execOptions.stdinData;
    const redirs = execOptions.redirections || {};

    try {
        if (redirs.stdin?.target) {
            const fd = fs.openSync(redirs.stdin.target, 'r');
            fdsToClose.push(fd);
            stdinStdio = fd;
        } else if (stdinData != null) {
            stdinStdio = 'pipe';
        }

        if (redirs.stdout?.target) {
            const fd = openWriteFd(redirs.stdout.target, redirs.stdout.append);
            fdsToClose.push(fd);
            stdoutStdio = fd;
        } else if (captureStdout) {
            stdoutStdio = 'pipe';
        }

        if (redirs.stderr?.target) {
            const fd = openWriteFd(redirs.stderr.target, redirs.stderr.append);
            fdsToClose.push(fd);
            stderrStdio = fd;
        }
    } catch (err) {
        console.error(err.message);
        fdsToClose.forEach(safeCloseFd);
        return { code: 1, stdout: '' };
    }

    const child = spawn(cmdName, args, { stdio: [stdinStdio, stdoutStdio, stderrStdio], env });

    // Once spawned, parent can close its copies of redirection fds.
    fdsToClose.forEach(safeCloseFd);

    if (stdinData != null && child.stdin) {
        child.stdin.write(Buffer.isBuffer(stdinData) ? stdinData : Buffer.from(String(stdinData)));
        child.stdin.end();
    }

    const stdoutChunks = [];
    if (captureStdout && child.stdout) {
        child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    }

    const code = await new Promise((resolve) => {
        child.on('error', () => {
            console.error(`${cmdName}: command not found`);
            resolve(127);
        });
        child.on('close', (exitCode) => resolve(exitCode == null ? 1 : exitCode));
    });

    return {
        code,
        stdout: captureStdout ? Buffer.concat(stdoutChunks).toString('utf8') : '',
    };
}

async function executeCommandAst(cmdAst, options) {
    const env = options.env || process.env;
    const ctx = { env };

    const expanded = await expandCommandAst(cmdAst, ctx);
    const cmdName = expanded.name;
    if (!cmdName) return { code: 0, stdout: '' };

    const execOptions = {
        env,
        captureStdout: Boolean(options.captureStdout),
        stdinData: options.stdinData,
        redirections: expanded.redirections,
    };

    if (BUILTINS[cmdName]) {
        return await executeBuiltin(cmdName, expanded.args, execOptions);
    }
    return await executeExternal(cmdName, expanded.args, execOptions);
}

async function executePipelineAst(pipelineAst, options = {}) {
    const env = options.env || process.env;
    const cmds = pipelineAst?.commands || [];
    if (cmds.length === 0) return { code: 0, stdout: '' };

    let stdinData = options.stdinData ?? null;
    let lastResult = { code: 0, stdout: '' };

    for (let idx = 0; idx < cmds.length; idx++) {
        const isLast = idx === cmds.length - 1;
        const captureStdout = !isLast || Boolean(options.captureStdout);

        lastResult = await executeCommandAst(cmds[idx], {
            env,
            stdinData,
            captureStdout,
        });

        stdinData = lastResult.stdout;
    }

    return {
        code: lastResult.code,
        stdout: Boolean(options.captureStdout) ? lastResult.stdout : '',
    };
}

async function execute(pipelineAst, options = {}) {
    const { code } = await executePipelineAst(pipelineAst, options);
    return code;
}

module.exports = { execute };

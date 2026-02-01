const fs = require('fs');
const { spawn } = require('child_process');
const { BUILTINS } = require('./commands/builtin-commands');

function expandWord(word) {
    return word.parts.map(part => {
        if (part.type === 'TEXT') return part.value;
        if (part.type === 'VAR') return process.env[part.name] || '';
        return '';
    }).join('');
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

function closeExtraFds(stdio) {
    stdio.forEach(fd => {
        if (typeof fd === 'number' && fd > 2) {
            try { fs.closeSync(fd); } catch {}
        }
    });
}

function openRedirectionFile(redir) {
    const flags = redir.append ? 'a' : 'w';
    const mode = 0o666;
    const filePath = expandWord(redir.target);
    try {
        return fs.openSync(filePath, flags, mode);
    } catch (err) {
        throw new Error(`Cannot open file ${filePath}: ${err.message}`);
    }
}

function executeCommand(cmdAst, stdin, stdout) {
    return new Promise((resolve) => {
        const cmdName = expandWord({ parts: [{ type: 'TEXT', value: cmdAst.name }] });
        const args = cmdAst.args.map(expandWord);
        const displayName = cmdName;
        const stdio = [stdin, stdout, process.stderr];
        
        try {
            if (cmdAst.redirections && cmdAst.redirections.stdin)
                stdio[0] = fs.openSync(expandWord(cmdAst.redirections.stdin.target), 'r');
            if (cmdAst.redirections && cmdAst.redirections.stdout)
                stdio[1] = openRedirectionFile(cmdAst.redirections.stdout);
            if (cmdAst.redirections && cmdAst.redirections.stderr)
                stdio[2] = openRedirectionFile(cmdAst.redirections.stderr);
        } catch (err) {
            console.error(err.message);
            return resolve(1);
        }
        
        if (BUILTINS[cmdName]) {
            const io = {
                writeStdout: createWriteFn(stdio[1], process.stdout),
                writeStderr: createWriteFn(stdio[2], process.stderr),
                stdoutIsTty: stdio[1] === 'inherit' && Boolean(process.stdout.isTTY),
                stderrIsTty: stdio[2] === process.stderr && Boolean(process.stderr.isTTY),
            };
            const ret = BUILTINS[cmdName](args, io);
            closeExtraFds(stdio);
            resolve(ret);
            return;
        }
        
        const child = spawn(cmdName, args, { stdio, env: process.env });
        
        child.on('error', (err) => {
            console.error(`${displayName}: command not found`);
            closeExtraFds(stdio);
            resolve(127);
        });
        child.on('close', (code) => {
            closeExtraFds(stdio);
            resolve(code === null ? 1 : code);
        });
    });
}

async function executePipeline(pipelineAst) {
    const cmds = pipelineAst.commands;
    if (cmds.length === 0) return 0;
    if (cmds.length === 1) return await executeCommand(cmds[0], 'inherit', 'inherit');
    console.warn("Note: Multiple pipes (|) are being implemented.");
    return await executeCommand(cmds[0], 'inherit', 'inherit');
}

module.exports = { execute: executePipeline };

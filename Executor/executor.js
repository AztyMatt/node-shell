const fs = require('fs');
const { spawn } = require('child_process');
const { BUILTINS } = require('./builtins');

function expandWord(word) {
    return word.parts.map(part => {
        if (part.type === 'TEXT') return part.value;
        if (part.type === 'VAR') return process.env[part.name] || '';
        return '';
    }).join('');
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
            const ret = BUILTINS[cmdName](args);
            resolve(ret);
            return;
        }
        
        const child = spawn(cmdName, args, { stdio, env: process.env });
        
        child.on('error', (err) => {
            console.error(`${cmdName}: command not found`);
            resolve(127);
        });
        child.on('close', (code) => {
            stdio.forEach(fd => { if (typeof fd === 'number' && fd > 2) fs.closeSync(fd); });
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



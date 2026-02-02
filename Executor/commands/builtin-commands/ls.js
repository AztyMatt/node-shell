const fs = require('fs');
const path = require('path');

const { normalizeIo, writeLine, expandHome } = require('./utils');
const { LIGHT_GREEN, RESET } = require('../../../color');

function padLeft(str, width) {
    return String(str).padStart(width, ' ');
}

function pad2(num) {
    return String(num).padStart(2, '0');
}

function formatMtime(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatMode(stat) {
    if (!stat) return '??????????';
    const type = stat.isDirectory() ? 'd' : stat.isSymbolicLink() ? 'l' : '-';
    const mode = stat.mode || 0;
    const bits = [
        0o400, 0o200, 0o100,
        0o040, 0o020, 0o010,
        0o004, 0o002, 0o001,
    ];
    const chars = ['r', 'w', 'x', 'r', 'w', 'x', 'r', 'w', 'x'];
    const perms = bits.map((bit, idx) => (mode & bit ? chars[idx] : '-')).join('');
    return `${type}${perms}`;
}

function isExecutable(stat, name) {
    if (!stat || stat.isDirectory()) return false;

    if (process.platform === 'win32') {
        const ext = path.extname(name).toLowerCase();
        return ['.exe', '.cmd', '.bat', '.com', '.ps1'].includes(ext);
    }

    return (stat.mode & 0o111) !== 0;
}

function formatHumanSize(bytes) {
    const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E'];
    let value = Number(bytes);
    if (!Number.isFinite(value)) value = 0;

    let unitIdx = 0;
    while (value >= 1024 && unitIdx < units.length - 1) {
        value /= 1024;
        unitIdx++;
    }

    if (unitIdx === 0) return `${Math.trunc(value)}B`;
    const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${rounded}${units[unitIdx]}`;
}

function parseLsArgs(args) {
    const opts = {
        all: false,
        long: false,
        human: false,
        recursive: false,
        classify: false,
        sort: 'name'
    };
    const targets = [];
    const unknown = [];
    let parseFlags = true;

    for (const arg of args) {
        if (parseFlags && arg === '--') {
            parseFlags = false;
            continue;
        }

        if (parseFlags && arg === '--all') {
            opts.all = true;
            continue;
        }

        if (parseFlags && arg.startsWith('--')) {
            unknown.push(arg);
            continue;
        }

        if (parseFlags && arg.startsWith('-') && arg !== '-') {
            for (const flag of arg.slice(1)) {
                if (flag === 'a') opts.all = true;
                else if (flag === 'l') opts.long = true;
                else if (flag === 'h') opts.human = true;
                else if (flag === 'R') opts.recursive = true;
                else if (flag === 'S') opts.sort = 'size';
                else if (flag === 't') opts.sort = 'time';
                else if (flag === 'F') opts.classify = true;
                else unknown.push(`-${flag}`);
            }
            continue;
        }

        targets.push(arg);
    }

    return { opts, targets, unknown };
}

function decorateName(name, stat, opts, useColor) {
    const isDir = Boolean(stat?.isDirectory?.());
    const executable = isExecutable(stat, name);
    const suffix = opts.classify ? (isDir ? '/' : executable ? '*' : '') : '';

    if (useColor && isDir) return `${LIGHT_GREEN}${name}${suffix}${RESET}`;
    return `${name}${suffix}`;
}

function resolveTarget(rawTarget, env) {
    const expanded = expandHome(rawTarget, env);
    return path.resolve(process.cwd(), expanded);
}

function readEntries(dirPath, opts) {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
    const entries = [];

    for (const dirent of dirents) {
        if (!opts.all && dirent.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, dirent.name);
        let stat = null;
        try {
            stat = fs.lstatSync(fullPath);
        } catch {
            stat = null;
        }
        entries.push({
            name: dirent.name,
            fullPath,
            stat,
            size: stat ? stat.size : 0,
            mtimeMs: stat ? stat.mtimeMs : 0,
        });
    }

    return entries;
}

function sortEntries(entries, opts) {
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (opts.sort === 'size') {
        return entries.sort((a, b) => (b.size - a.size) || byName(a, b));
    }
    if (opts.sort === 'time') {
        return entries.sort((a, b) => (b.mtimeMs - a.mtimeMs) || byName(a, b));
    }
    return entries.sort(byName);
}

function printDirectory(dirPath, displayPath, opts, ctx, depth) {
    const { writeStdout, writeStderr, useColor, multipleTargets } = ctx;

    const showHeader = multipleTargets || (opts.recursive && depth > 0);
    if (showHeader) writeLine(writeStdout, `${displayPath}:`);

    let entries;
    try {
        entries = sortEntries(readEntries(dirPath, opts), opts);
    } catch (err) {
        const msg = err?.code === 'EACCES'
            ? `ls: cannot open directory '${displayPath}': Permission denied`
            : `ls: cannot open directory '${displayPath}': ${err.message}`;
        writeLine(writeStderr, msg);
        return 1;
    }

    if (!opts.long) {
        entries.forEach((e) => writeLine(writeStdout, decorateName(e.name, e.stat, opts, useColor)));
    } else {
        const sizes = entries.map((e) => {
            const raw = e.stat ? e.stat.size : 0;
            return opts.human ? formatHumanSize(raw) : String(raw);
        });
        const sizeWidth = Math.max(1, ...sizes.map((s) => s.length));

        entries.forEach((e, idx) => {
            const mode = formatMode(e.stat);
            const size = padLeft(sizes[idx], sizeWidth);
            const mtime = e.stat ? formatMtime(e.stat.mtime) : '????-??-?? ??:??';
            const name = decorateName(e.name, e.stat, opts, useColor);
            writeLine(writeStdout, `${mode} ${size} ${mtime} ${name}`);
        });
    }

    if (opts.recursive) {
        const subDirs = entries
            .filter((e) => e.stat && e.stat.isDirectory() && (opts.all || !e.name.startsWith('.')))
            .map((e) => ({ fullPath: e.fullPath, name: e.name }));

        for (const sub of subDirs) {
            writeLine(writeStdout);
            const subDisplay = displayPath === '.'
                ? `.${path.sep}${sub.name}`
                : path.join(displayPath, sub.name);
            const code = printDirectory(sub.fullPath, subDisplay, opts, ctx, depth + 1);
            if (code !== 0) ctx.exitCode = 1;
        }
    }

    return 0;
}

function ls(args, io) {
    const { writeStdout, writeStderr } = normalizeIo(io);
    const env = io?.env || process.env;
    const useColor = Boolean(io?.stdoutIsTty);

    const { opts, targets, unknown } = parseLsArgs(args);
    if (unknown.length) {
        writeLine(writeStderr, `ls: invalid option(s): ${unknown.join(' ')}`);
        return 2;
    }

    const actualTargets = targets.length ? targets : ['.'];
    const multipleTargets = actualTargets.length > 1;

    const ctx = { writeStdout, writeStderr, useColor, multipleTargets, exitCode: 0 };

    for (let i = 0; i < actualTargets.length; i++) {
        const rawTarget = actualTargets[i];
        const resolved = resolveTarget(rawTarget, env);

        let stat;
        try {
            stat = fs.lstatSync(resolved);
        } catch (err) {
            const msg = err?.code === 'ENOENT'
                ? `ls: cannot access '${rawTarget}': No such file or directory`
                : `ls: cannot access '${rawTarget}': ${err.message}`;
            writeLine(writeStderr, msg);
            ctx.exitCode = 1;
            continue;
        }

        if (stat.isDirectory()) {
            const code = printDirectory(resolved, rawTarget, opts, ctx, 0);
            if (code !== 0) ctx.exitCode = 1;
        } else {
            if (multipleTargets) {
                writeLine(writeStdout, `${rawTarget}:`);
            }
            const name = decorateName(path.basename(resolved), stat, opts, useColor);
            if (opts.long) {
                const mode = formatMode(stat);
                const size = opts.human ? formatHumanSize(stat.size) : String(stat.size);
                const mtime = formatMtime(stat.mtime);
                writeLine(writeStdout, `${mode} ${size} ${mtime} ${name}`);
            } else {
                writeLine(writeStdout, name);
            }
        }

        if (multipleTargets && i < actualTargets.length - 1) {
            writeLine(writeStdout);
        }
    }

    return ctx.exitCode;
}

module.exports = { ls };

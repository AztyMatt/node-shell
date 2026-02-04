const fs = require('fs');
const path = require('path');

const ENV_META = Symbol('node-shell:envMeta');

function attachEnvMeta(env, meta) {
    if (!env || typeof env !== 'object') return;
    try {
        Object.defineProperty(env, ENV_META, {
            value: meta,
            enumerable: false,
            configurable: false,
            writable: false,
        });
    } catch {}
}

function getEnvMeta(env) {
    if (!env || typeof env !== 'object') return null;
    return env[ENV_META] || null;
}

function ensureEnvMeta(env) {
    if (!env || typeof env !== 'object') return null;
    const existing = getEnvMeta(env);
    if (existing) return existing;

    const meta = { fromDotEnv: new Set(), fromExport: new Set() };
    attachEnvMeta(env, meta);
    return getEnvMeta(env);
}

function parseDotEnvValue(raw) {
    if (raw == null) return '';
    const trimmed = String(raw).trim();
    if (trimmed === '') return '';

    const quote = trimmed[0];
    if (quote === '"' || quote === '\'') {
        let i = 1;
        let out = '';
        let closed = false;

        while (i < trimmed.length) {
            const ch = trimmed[i];

            if (ch === quote) {
                closed = true;
                i++;
                break;
            }

            if (quote === '"' && ch === '\\') {
                i++;
                const esc = trimmed[i];
                if (esc == null) break;
                if (esc === 'n') out += '\n';
                else if (esc === 'r') out += '\r';
                else if (esc === 't') out += '\t';
                else out += esc;
                i++;
                continue;
            }

            out += ch;
            i++;
        }

        if (closed) return out;
    }

    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '#' && (i === 0 || /\s/.test(trimmed[i - 1]))) {
            return trimmed.slice(0, i).trimEnd();
        }
    }

    return trimmed;
}

function parseDotEnv(content) {
    const vars = {};
    const lines = String(content ?? '').split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trimStart() : trimmed;
        const eqIdx = withoutExport.indexOf('=');
        if (eqIdx === -1) continue;

        const key = withoutExport.slice(0, eqIdx).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

        const rawValue = withoutExport.slice(eqIdx + 1);
        vars[key] = parseDotEnvValue(rawValue);
    }

    return vars;
}

function loadDotEnvFile(dotEnvPath) {
    try {
        if (!fs.existsSync(dotEnvPath)) return {};
        const content = fs.readFileSync(dotEnvPath, 'utf8');
        return parseDotEnv(content);
    } catch {
        return {};
    }
}

function createSessionEnv(options = {}) {
    const cwd = options.cwd || process.cwd();
    const baseEnv = options.baseEnv || process.env;
    const dotEnvPath = options.dotEnvPath || path.resolve(cwd, '.env');

    const sessionEnv = { ...baseEnv };
    const fromFile = loadDotEnvFile(dotEnvPath);
    Object.assign(sessionEnv, fromFile);

    attachEnvMeta(sessionEnv, {
        fromDotEnv: new Set(Object.keys(fromFile)),
        fromExport: new Set(),
    });

    return sessionEnv;
}

module.exports = { createSessionEnv, parseDotEnv, loadDotEnvFile, ensureEnvMeta, getEnvMeta };

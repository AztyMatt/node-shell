const { exit } = require('./exit');
const { cd } = require('./cd');
const { ls } = require('./ls');
const { pwd } = require('./pwd');
const { mkdir } = require('./mkdir');
const { touch } = require('./touch');
const { rm } = require('./rm');
const { echo } = require('./echo');
const { export: exportBuiltin } = require('./export');
const { env } = require('./env');
const { unset } = require('./unset');

const BUILTINS = {
    exit,
    cd,
    ls,
    pwd,
    mkdir,
    touch,
    rm,
    echo,
    export: exportBuiltin,
    env,
    unset,
};

module.exports = { BUILTINS };

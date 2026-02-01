const { exit } = require('./exit');
const { cd } = require('./cd');
const { ls } = require('./ls');
const { pwd } = require('./pwd');
const { mkdir } = require('./mkdir');
const { touch } = require('./touch');
const { rm } = require('./rm');

const BUILTINS = {
    exit,
    cd,
    ls,
    pwd,
    mkdir,
    touch,
    rm,
};

module.exports = { BUILTINS };
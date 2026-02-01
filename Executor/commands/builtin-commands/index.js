const { exit } = require('./exit');
const { cd } = require('./cd');
const { ls } = require('./ls');

const BUILTINS = {
    exit,
    cd,
    ls,
};

module.exports = { BUILTINS };
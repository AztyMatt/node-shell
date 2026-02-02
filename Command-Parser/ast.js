function Pipeline(commands = []) {
    return { type: 'Pipeline', commands };
}

function Command(name = null, args = [], redirections = {}) {
    return { type: 'Command', name, args, redirections };
}

const WORD_PART = {
    TEXT: 'TEXT',
    VAR: 'VAR',
    SUBCMD: 'SUBCMD',
};

function TextPart(value) {
    return { type: WORD_PART.TEXT, value };
}

function VarPart(name) {
    return { type: WORD_PART.VAR, name };
}

function SubCmdPart(pipeline) {
    return { type: WORD_PART.SUBCMD, pipeline };
}

function Word(parts = []) {
    return { type: 'Word', parts };
}

module.exports = {
    Pipeline, Command, Word, TextPart, VarPart, SubCmdPart, WORD_PART
};

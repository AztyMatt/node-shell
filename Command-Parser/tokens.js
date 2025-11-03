const TOKEN = {
    WORD: 'WORD',
    PIPE: 'PIPE',
    REDIR_OUT: 'REDIR_OUT',
    REDIR_OUT_APPEND: 'REDIR_OUT_APPEND',
    REDIR_IN: 'REDIR_IN',
    REDIR_FD: 'REDIR_FD',
};

const OPERATORS = [
    { sym: '>>', type: TOKEN.REDIR_OUT_APPEND },
    { sym: '>',  type: TOKEN.REDIR_OUT },
    { sym: '<',  type: TOKEN.REDIR_IN },
    { sym: '|',  type: TOKEN.PIPE },
];

module.exports = { TOKEN, OPERATORS };
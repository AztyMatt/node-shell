const TOKEN = {
    WORD: 'WORD',
    PIPE: 'PIPE',
    REDIR_OUT: 'REDIR_OUT',
    REDIR_OUT_APPEND: 'REDIR_OUT_APPEND',
    REDIR_IN: 'REDIR_IN',
    REDIR_FD: 'REDIR_FD',
};

const OPERATORS = ['|', '>>', '>', '<'];

module.exports = { TOKEN, OPERATORS };
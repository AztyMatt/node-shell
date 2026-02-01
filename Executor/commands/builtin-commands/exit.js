function exit(args) {
    const code = args.length > 0 ? parseInt(args[0], 10) : 0;
    process.exit(isNaN(code) ? 0 : code);
}

module.exports = { exit };


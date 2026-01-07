const path = require('path');

const BUILTINS = {
    cd: (args) => {
        if (!args.length) {
            const home = process.env.HOME || process.env.USERPROFILE;
            if (home) process.chdir(home);
            return 0;
        }
        try {
            const target = path.resolve(process.cwd(), args[0]);
            process.chdir(target);
            return 0;
        } catch (err) {
            console.error(`cd: no such file or directory: ${args[0]}`);
            return 1;
        }
    },
    exit: (args) => {
        const code = args.length > 0 ? parseInt(args[0], 10) : 0;
        process.exit(isNaN(code) ? 0 : code);
    }
};


module.exports = { BUILTINS };
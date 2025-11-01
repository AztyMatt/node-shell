const { lexer } = require('./lexer');
const { parse } = require('./parser');

function show(title, value) {
    console.log('\n' + title);
    console.log(JSON.stringify(value, null, 2));
}

const input1 = "echo hello world";
const input2 = "ls -l | grep txt";
const input3 = "echo $(whoami) > output.txt";
const input4 = "2>> errors.log cat < input.txt";

show("LEXER 1", lexer(input1));
show("LEXER 2", lexer(input2));
show("LEXER 3", lexer(input3));
show("LEXER 4", lexer(input4));

show("PARSER 1", parse(input1));
show("PARSER 2", parse(input2));
show("PARSER 3", parse(input3));
show("PARSER 4", parse(input4));

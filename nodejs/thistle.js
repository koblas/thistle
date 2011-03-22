var sys = require('sys');

var Token = require('./token');

module.exports = Thistle;

function Thistle(tmpl) {
    var Lexer  = require('./lexer');
    var Parser = require('./parser');

    this.lexer  = new Lexer(tmpl);
    this.parser = new Parser(this.lexer.tokenize());
    this._nodes = this.parser.parse();
};

Thistle.FILTER_SEPARATOR = '|';
Thistle.FILTER_ARGUMENT_SEPARATOR = ':';
Thistle.VARIABLE_ATTRIBUTE_SEPARATOR = '.';
Thistle.BLOCK_TAG_START = '{%';
Thistle.BLOCK_TAG_END = '%}';
Thistle.VARIABLE_TAG_START = '{{';
Thistle.VARIABLE_TAG_END = '}}';
Thistle.COMMENT_TAG_START = '{#';
Thistle.COMMENT_TAG_END = '#}';
Thistle.SINGLE_BRACE_START = '{';
Thistle.SINGLE_BRACE_END = '}';

Thistle.prototype = {
    render : function(view) {
        // sys.puts('Doing render');
        return this._nodes.render(view || {});
    }
};

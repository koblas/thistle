var sys = require('sys');

var Token  = require('./token');

module.exports = Thistle;

function Thistle(tmpl) {
    var Parser = require('./parser');
    var Lexer  = require('./lexer');

    this.lexer  = new Lexer(tmpl);
    this.parser = new Parser(this.lexer.tokenize());
    this._nodes = this.parser.parse();
};

function xParseException(message) { this.message = message; Error.apply(this, arguments); }
xParseException.prototype = new Error();
xParseException.prototype.constructor = xParseException;
xParseException.prototype.name = "Thistle.ParseException";


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

Thistle.TEMPLATE_STRING_IF_INVALID = '';

Thistle.ParseException      = xParseException;
Thistle.TemplateSyntaxError = xParseException;

Thistle._filters = {}

Thistle.prototype = {
    render : function(view) {
        // sys.puts('Doing render');
        var data;
        
        try {
            data = this._nodes.render(view || {});
        } catch (e) {
            throw this.TemplateSyntaxError;
        }

        return data;
    },
};

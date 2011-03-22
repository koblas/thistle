var sys = require('sys');

var Token = require('./token');
var Thistle = require('./thistle');

module.exports = Lexer;

function Lexer(tmpl_string) {
    this.template_string = tmpl_string;
};

var _escapeRE = new RegExp('(\\' + ([ '/','.','*','+','?','|','(',')','[',']','{','}','\\' ].join('|\\')) + ')', 'g');
function escapeRE(str) {
    return str.replace(_escapeRE, '\\$1');
};

Lexer.prototype = {
    tag_re    : new RegExp('(' + escapeRE(Thistle.BLOCK_TAG_START) + '.*?' + escapeRE(Thistle.BLOCK_TAG_END) +
                           '|' + escapeRE(Thistle.VARIABLE_TAG_START) + '.*?' + escapeRE(Thistle.VARIABLE_TAG_END) +
                           '|' + escapeRE(Thistle.COMMENT_TAG_START) + '.*?' + escapeRE(Thistle.COMMENT_TAG_END) +
                           ')'),

    tokenize : function() {
        var in_tag = false;
        var result = [];

        var parts = this.template_string.split(this.tag_re);

        for (var idx = 0; idx < parts.length; idx++) {
            var bit = parts[idx];
            if (bit.length != 0) 
                result.push(this.create_token(bit, in_tag));
            in_tag = !in_tag;
        }

        return result;
    },

    create_token : function(token_string, in_tag) {
        if (in_tag) {
            if (token_string.substr(0, Thistle.VARIABLE_TAG_START.length) == Thistle.VARIABLE_TAG_START) {
                // sys.puts("VARIABLE .... " + token_string);
                return new Token(Token.TOKEN_VAR, token_string.substr(Thistle.VARIABLE_TAG_START.length, 
                                                  token_string.length - Thistle.VARIABLE_TAG_START.length - Thistle.VARIABLE_TAG_END.length).trim());
            }
            if (token_string.substr(0, Thistle.BLOCK_TAG_START.length) == Thistle.BLOCK_TAG_START) {
                return new Token(Token.TOKEN_BLOCK, token_string.substr(Thistle.BLOCK_TAG_START.length, 
                                                  token_string.length -  Thistle.BLOCK_TAG_START.length - Thistle.BLOCK_TAG_END.length).trim());
            }
            if (token_string.substr(0, Thistle.COMMENT_TAG_START.length) == Thistle.COMMENT_TAG_START) {
                return new Token(Token.TOKEN_COMMENT, '');
            }
        } else {
            return new Token(Token.TOKEN_TEXT, token_string);
        }
        // TODO - Throw
    }
};

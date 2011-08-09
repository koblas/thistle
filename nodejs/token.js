var sys = require('sys');

module.exports = Token;

function Token(type, contents) {
    this.type = type;
    this.contents = contents;
};
    
Token.TOKEN_TEXT    = 0;
Token.TOKEN_VAR     = 1;
Token.TOKEN_BLOCK   = 2;
Token.TOKEN_CONTENT = 3;

Token.prototype = {
    toString : function() {
        //sys.puts(this.type);
        var stype = ["Text", "Var", "Block", "Comment"];
        if (this.contents.length <= 20) {
            return '<' + stype[this.type] + ' "' + this.contents + '">';
        } else {
            return '<' + stype[this.type] + ' "' + this.contents.substr(0, 20) + '...">';
        }
    },

    split_contents : function() {
        var RE = /([^\s"]*"(?:[^"\\]*(?:\\.[^"\\]*)*)"\S*|[^\s']*'(?:[^'\\]*(?:\\.[^'\\]*)*)'\S*|\S+)/;
        var split = [];

        // sys.puts("TOKEN = '" + this.contents + "'");

        var parts = this.contents.split(RE).filter(function (s) {
            for (var i = 0; i < s.length; i++) {
                if (s[i] != ' ') {
                    return true;
                }
            }
            return false;
        });

        // sys.puts("PARTS = [" + parts + "]");

        for (var i = 0; i < parts.length; i++) {
            var bit = parts[i];
            if (bit.length == 0) continue;
            //sys.puts('DEBUG: ' + bit)
            if (bit.substr(0, 3) == '_("' || bit.substr(0,3) == "_('") {
                var sentinal = bit.charAt(2) + ')';
                var trans_bit = [bit];
                while (! bit.substr(bit.length - 3) == sentinal) {
                    bit = parts[++i];
                    trans_bit.push(bit);
                }
                bit = trans_bit.join(' ');
            }
            split.push(bit)
        }

        return split;
    }
};

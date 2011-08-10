var sys = require('sys');
var extend = require('./util');

/*
** Parser and utilities for the smart 'if' tag
*/

// Using a simple top down parser, as described here:
//    http://effbot.org/zone/simple-top-down-parsing.htm.
// 'led' = left denotation
// 'nud' = null denotation
// 'bp' = binding power (left = lbp, right = rbp)

function TokenBase() {
    this.id = null;     // node/token type name
    this.value = null;  // used by literals
    this.first = null;  // used by tree nodes
    this.second = null; // used by tree nodes
}

extend(TokenBase, Object, {
    nud: function(parser) {
        // Null denotation - called in prefix context
        throw new parser.error_class("Not expecting '"+this.id+"' in this position in if tag.")
    },

    led: function(left, parser) {
        // Null denotation - called in prefix context
        throw new parser.error_class("Not expecting '"+this.id+"' as infix operator in if tag.")
    },

    display: function() {
        // Returns what to display in error messages for this node
        return this.id
    },

    toString: function() {
        var str = "";

        if (this.id)
            str += (str.length != 0 ? " " : "") + this.id;
        if (this.first)
            str += (str.length != 0 ? " " : "") + this.first;
        if (this.second)
            str += (str.length != 0 ? " " : "") + this.second;

        return "<TokenBase " + str + ">";
    }
});

function infix(bp, func) {
    // Creates an infix operator, given a binding power and a function that evaluates the node

    var klass = function() {
        this.lbp = bp;
        TokenBase.apply(this);
    }

    extend(klass, TokenBase, {
        led: function(left, parser) {
            this.first = left;
            this.second = parser.expression(bp);
            return this;
        },

        eval: function(context) {
            try {
                return func(context, this.first, this.second);
            } catch(e) {
                // Templates shouldn't throw exceptions when rendering.  We are
                // most likely to get exceptions for things like {% if foo in bar
                // %} where 'bar' does not support 'in', so default to False
                return false
            }
        }
    });

    return klass;
}

function prefix(bp, func) {
    // Creates an infix operator, given a binding power and a function that evaluates the node

    var klass = function() {
        TokenBase.apply(this);
        this.lbp = bp;
    }

    extend(klass, TokenBase, {
        nud: function(parser) {
            this.first = parser.expression(bp);
            this.second = null;
            return this;
        },

        eval: function(context) {
            try {
                return func(context, this.first);
            } catch(e) {
                return false
            }
        }
    });

    return klass;
}

// Operator precedence follows Python.
// NB - we can get slightly more accurate syntax error messages by not using the
// same object for '==' and '='.
// We defer variable evaluation to the lambda to ensure that terms are
// lazily evaluated using Python's boolean parsing logic.
OPERATORS = {
    'or': infix(6, function(context, x, y) { return x.eval(context) || y.eval(context); }),
    'and': infix(7, function(context, x, y) { return x.eval(context) && y.eval(context); }),
    'not': prefix(8, function(context, x) { return ! x.eval(context); }),
    /*
    'in': infix(9, function(context, x, y) { return x.eval(context) in y.eval(context); }),
    'not in': infix(9, function(context, x, y) { return x.eval(context) not in y.eval(context); }),
    */
    '=': infix(10, function(context, x, y) { return x.eval(context) == y.eval(context); }),
    '==': infix(10, function(context, x, y) { return x.eval(context) == y.eval(context); }),
    '!=': infix(10, function(context, x, y) { return x.eval(context) != y.eval(context); }),
    '>': infix(10, function(context, x, y) { return x.eval(context) > y.eval(context); }),
    '>=': infix(10, function(context, x, y) { return x.eval(context) >= y.eval(context); }),
    '<': infix(10, function(context, x, y) { return x.eval(context) < y.eval(context); }),
    '<=': infix(10, function(context, x, y) { return x.eval(context) <= y.eval(context); }),
}

// Assign 'id' to each:
for (var key in OPERATORS) {
    OPERATORS[key].id = key
}

// IfParser uses Literal in create_var, but TemplateIfParser overrides
// create_var so that a proper implementation that actually resolves
// variables, filters etc is used.
function Literal(value) {
    // A basic self-resolvable object similar to a Django template variable.
    this.value = value;
    this.id = "literal";
    this.lbp = 0;
}

extend(Literal, TokenBase, {
    display: function() {
        return this.toString();
    },

    nud: function(parser) {
        return this;
    },

    eval: function(context) {
        return this.value;
    },

    toString: function() {
        return "<Literal " + this.id + " " + this.value + ">";
    },
});

function EndToken() {
    this.lbp = 0;
    TokenBase();
}

extend(EndToken, TokenBase, {
    nud: function(parser) {
        throw new parser.error_class("Unexpected end of expression in if tag.")
    },
});

endToken = new EndToken()

function IfParser(tokens) {
    // pre-pass necessary to turn  'not','in' into single token
    var l = tokens.length;
    var mapped_tokens = []

    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token == "not" && i + 1 < l && tokens[i+1] == "in") {
            token = "not in";
            i++; // skip 'in'
        }
        mapped_tokens.push(this.translate_token(token));
    }
    // sys.puts(mapped_tokens);

    this.tokens = mapped_tokens
    this.pos = 0
    this.current_token = this.next()
}

extend(IfParser, Object, {
    translate_token: function(token) {
        var op = OPERATORS[token];
        if (op == undefined)
            return this.create_var(token);
        return new op();
    },

    next: function() {
        // sys.puts("NEXT: pos=" + this.pos + " len= " + this.tokens.length);
        if (this.pos >= this.tokens.length)
            return endToken;
        return this.tokens[this.pos++]
    },

    parse: function() {
        var retval = this.expression(0);

        // 
        if (this.current_token != endToken)
            throw new this.error_class("Unused '"+this.current_token.display()+"' at end of if expression.")
        return retval;
    },

    expression: function(rbp) {
        var t = this.current_token;
        var left;

        this.current_token = this.next();
        left = t.nud(this);
        while (rbp < this.current_token.lbp) {
            t = this.current_token;
            this.current_token = this.next();
            left = t.led(left, this);
        }
        return left;
    },

    create_var: function(value) {
        return new Literal(value);
    }
});

module.exports = {
    IfParser: IfParser,
    Literal : Literal,
};

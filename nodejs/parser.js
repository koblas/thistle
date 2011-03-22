var sys = require('sys');
var extend = require('./util');
var Token = require('./token');
var Thistle = require('./thistle');
var XRegExp = require('./xregexp');

module.exports = Parser;

function ParseException(message) {
    this.message = message;
    this.name = "ParseException";
}

function Parser(tokens) {
    this.tokens = tokens;

    this.tags = {};
    this.filters = {};
};

var _escapeRE = new RegExp('(\\' + ([ '/','.','*','+','?','|','(',')','[',']','{','}','\\' ].join('|\\')) + ')', 'g');
function escapeRE(str) {
    return (str + "").replace(_escapeRE, '\\$1');
};
    
Parser.prototype = {
    parse : function(parse_until) {
        parse_until = parse_until || [];

        var nodelist = this.create_nodelist();

        for (idx in this.tokens) {
            //sys.puts("IDX = " + idx);
            var token = this.tokens[idx];
            if (token.type == Token.TOKEN_TEXT) {
                //sys.puts("DOING TEXT");
                this.extend_nodelist(nodelist, new TextNode(token.contents), token);
                //sys.puts("DONEDOING TEXT " + nodelist.length);
            } else if (token.type == Token.TOKEN_VAR) {
                //sys.puts("DOING VAR");
                if (token.contents.length == 0)
                    this.empty_variable(token);
                var filter_expression = this.compile_filter(token.contents);
                var var_node = this.create_variable_node(filter_expression);
                this.extend_nodelist(nodelist, var_node, token);
            } else if (token.type == Token.TOKEN_BLOCK) {
                sys.puts("DOING BLOCK");
                if (parse_until.some(function(x) { return x == token.contents; })) {
                    this.prepend_token(token);
                    return nodelist;
                }

                var command = token.contents.split(/\s+/);
                if (command.length == 0) {
                    this.empty_block_tag(token);
                    command = null;
                } else {
                    command = command[0];
                }

                this.enter_command(command, token);

                var compiled_result = null;
                var compile_func = this.tags[command];

                if (typeof(compile_func) == 'undefined') {
                    this.invalid_block_tag(token, command);
                }

                try {
                    compiled_result = compile_func(this, token);
                } catch(e) {
                    if (!this.compile_function_error(token, e)) {
                        throw e;
                    }
                }

                this.extend_nodelist(nodelist, compiled_result, token);
                this.exit_command();
            }

            if (parse_until.length != 0) {
                this.unclosed_block_tag(parse_until);
            }
        }

        //sys.puts("DONE PARSE");
        return nodelist;
    },

    skip_past : function(endtag) {
    },

    create_variable_node : function(filter_expression) {
        return new VariableNode(filter_expression);
    },

    create_nodelist : function() {
        return new NodeList();
    },

    extend_nodelist : function(nodelist, node, token) {
        if (node.must_be_first && nodelist.length != 0) {
            if (nodelist.contains_nontext) {
            } else {
                // TODO - figure this out.
            }
        }
        if ((nodelist instanceof NodeList) && !(node instanceof TextNode)) 
            nodelist.contains_nontext = true;
        nodelist.push(node);
    },

    enter_command : function(command, token) { },
    exit_command  : function(command, token) { },

    empty_variable_tag : function(token) {
        throw new ParseException("Empty variable tag");
    },

    empty_block_tag : function(token) {
        throw new ParseException("Empty block tag");
    },

    invalid_block_tag : function(token, command) {
        throw new ParseException("Invalid block tag: " + command);
    },

    unclosed_block_tag : function(parse_until) {
        throw new ParseException("Unclosed tag: " + parse_until.join(', '));
    },

    compile_function_error : function(token, e) {
        // nothing
    },

    next_token : function() {
        return this.tokens.shift();
    },

    prepend_token : function(token) {
        this.tokens.unshift(token);
    },

    compile_filter : function(token) {
        return new FilterExpression(token, this);
    },

    find_filter : function(filter_name) {
        try {
            return this.filters[filter_name];
        } catch (e) {
            throw new ParseException("Invalid filter: '"+filter_name+'"');
        }
    }
};

//
//  
//
var Node = function() {
    this.must_be_first = false;
}

extend(Node, Object, {
    render : function (context) {
        // Return the node rendered as a string
    },
    get_nodes_by_type : function (nodetype) {
        var nodes = [];
        if (this instanceof nodetype)
            nodes.push(this); 
        var nlist = node.nodelist || [];
        for (var idx in nlist) {
            var chld = nlist[idx].get_nodes_by_type(nodetype);
            for (var j in chld) {
                nodes.push(chld[j]);
            }
        }

        return nodes;
    }
});

//
//  
//
var NodeList = function() {
}

extend(NodeList, Array, {
    render_node : function(node, context) {
        return node.render(context);
    },
        
    render : function(context) {
        var t = this;
        var bits = this.map(function(node) {
            if (node instanceof Node) {
                //sys.puts("NodeList context = " + context);
                return t.render_node(node, context);
            } else {
                return node;
            }
        });

        return bits.join('');
    },

    get_nodes_by_type : function(nodetype) {
        var nodes = []
        for (var idx in this) {
            var chld = this[idx].get_nodes_by_type(nodetype);
            for (var j in chld) {
                nodes.push(chld[j]);
            }
        }
        return nodes;
    }
});

//
//
//
function TextNode(s) {
    this.s = s;
    this.must_be_first = false;
}
extend(TextNode, Node, {
    toString : function() {
        return "<Text Node: '" + this.s.substr(0,25) + "'>";
    },
    render : function(context) {
        return this.s;
    }
});

function VariableNode(filter_expression) {
    this.filter_expression = filter_expression;
    this.must_be_first = false;
}
extend(VariableNode, Node, {
    toString : function() {
        return "<Variable Node: " + this.filter_expression + ">";
    },
    render : function(context) {
        function in_context(value, context) {
            // TODO - work
            return value;
        };

        var output = this.filter_expression.resolve(context);

        return in_context(output, context);
    }
});

//
//
//
function Variable(val) {
    this.val = val;
    this.literal = null;
    this.lookups = null;
    this.translate = false;

    try {
        if (/^[+\-]?\d+$/.test(val)) {
            this.literal = parseInt(val);
        } else if (/^([+-]?(((\d+(\.)?)|(\d*\.\d+))([eE][+-]?\d+)?))$/.test(val)) {
            this.literal = parseFloat(val);
        } else {
            throw true;
        }
    } catch(e) {
        // sys.puts(e);
        if ((val.substr(0, 2) == '_(') && (val.charAt(val.length - 1) == ')')) {
            this.translate = true;
            val = substr(2, val.length - 3);
        }
        if ((val.charAt(0) == '"' || val.charAt(0) == "'") && val.charAt(0) == val.charAt(val.length-1)) {
            this.literal = val.substr(1, val.length - 2).replace('\\\\', '\\');
        } else {
            this.lookups = val.split(Thistle.VARIABLE_ATTRIBUTE_SEPARATOR);
        }
    }
}
extend(Variable, Object, {
    toString : function() {
        return this.val;
    },

    resolve: function(context) {
        // sys.puts("DOING RESOLVE");
        if (this.lookups) {
            value = this._resolve_lookup(context);
        } else {
            value = this.literal;
        }
        // TODO this.translate is not supported
        return value;
    },

    _resolve_lookup: function(context) {
        ///
        // Performs resolution of a real variable (i.e. not a literal) against the
        // given context.
        // 
        // As indicated by the method's name, this method is an implementation
        // detail and shouldn't be called by external code. Use Variable.resolve()
        // instead.
        
        var current = context;

        for (var idx in this.lookups) {
            var bit = this.lookups[idx];
            // sys.puts("bit = " + bit);
            var bval = current[bit];
            // sys.puts("LOOKUP " + bval);
                
            var tval = typeof(bval);
            if (tval == 'undefined') {
                current = current[parseInt(bval)]
            } else if (tval == 'function') {
                current = bval();
            } else {
                current = bval;
            }
        }

        return current;
    }
});

//
//
//
function FilterExpression(token, parser) {
    this.token = token;
    this.parser = parser;

    var filters = [];
    var val_obj = null;
    var upto    = 0;
    var self    = this;

    XRegExp.iterate(token, this.filter_re, function(match) {
        //sys.puts('m[] ('+match.val+')= ' + match);

        if (val_obj == null) {
            if (match.constant) {
                //sys.puts("GOT CONSTNAT " +  match.constant);
                val_obj = new Variable(match.constant).resolve({});
            } else if (match.val) {
                //sys.puts("GOT VALUE = " + match.val);
                val_obj = new Variable(match.val);
            } else {
                // TODO error
            }
        } else {
            var filter_name = match.filtername;
            var args = [];
            var constant_arg = match.constantarg;
            var val_arg = match.valarg;

            if (constant_arg) {
                args.push([false, new Variable(constant_arg).resolve({})]);
            } else if (val_arg) {
                args.push([true, new Variable(val_arg)]);
            }
            //sys.puts("HERE");
            var filter_func = parser.find_filter(filter_name);
            self.args_check(filter_name, filter_func, args);
            filters.push({func:filter_func, args:args});
        }
    });

    // sys.puts("VALU = " + val_obj);

    this.fillters = filters;
    this.val      = val_obj;
}

extend(FilterExpression, Object, {
    filter_re : function() {
        var constant_string = '(?:%(i18n_open)s%(strdq)s%(i18n_close)s|%(i18n_open)s%(strsq)s%(i18n_close)s|%(strdq)s|%(strsq)s)';

        constant_string = constant_string.replace(/%\(strdq\)s/g, /'"[^"\\]*(?:\\.[^"\\]*)*"/ + "")
                                         .replace(/%\(strsq\)s/g, /'[^'\\]*(?:\\.[^'\\]*)*'/ + "")
                                         .replace(/%\(i18n_open\)s/g, escapeRE('_('))
                                         .replace(/%\(i18n_close\)s/g, escapeRE(')'))
                        ;

        var pat = '^(?<constant>%(constant)s)|'
                + '^(?<val>[%(var_chars)s]+|%(num)s)|'
                +  '(?:%(filter_sep)s'
                +     '(?<filtername>\\w+)'
                +         '(?:%(arg_sep)s'
                +           '(?:'
                +            '(?<constantarg>%(constant)s)|'
                +            '(?<valarg>[%(var_chars)s]+|%(num)s)'
                +           ')'
                +         ')?'
                +  ')'
                ;

        pat = pat.replace(/%\(constant\)s/g, constant_string)
                 .replace(/%\(num\)s/g, '[-+\\.]?\\d[\\d\\.e]*')
                 .replace(/%\(var_chars\)s/g, '\\w\\.')
                 .replace(/%\(filter_sep\)s/g, escapeRE(Thistle.FILTER_SEPARATOR))
                 .replace(/%\(arg_sep\)s/g, escapeRE(Thistle.FILTER_ARGUMENT_SEPARATOR))
            ;

        //sys.puts(pat);

        /*
        var t = XRegExp("(?<word>[\\w+\\.]+)");
        XRegExp.iterate("testing", t, function(m) { sys.puts("XX" + m.word); });
        sys.puts("DONE");
        */

        var regex = XRegExp(pat);

        //XRegExp.iterate("testing", regex, function(m) { sys.puts("XX" + m.val); });

        return regex;
    }(),

    resolve : function(context, ignore_failures) {
        ignore_failures = ignore_failures || false;

        var obj;

        if (this.val instanceof Variable) {
            obj = this.val.resolve(context);
            // TODO doesn't exist
        } else {
            obj = this.val;
        }

        for (var idx in this.filters) {
            var func = this.filters[idx].func;
            var args = this.filters[idx].args;

            // TODO lookup
        }
        return obj
    },

    args_check : function(name, provided) {
    }
});

var sys = require('sys');
var extend = require('./util');

var Token  = require('./token');

module.exports = Thistle;

function Thistle() {
};

function xParseException(message) {
    var err = new Error();

    if (err.stack) {
        this.stack = this.stack.split(/\n/)[0] + ": " + message + "\n" + err.stack.split(/\n/).slice(2).join("\n");
    }

    this.message = message;
}

xParseException.prototype = new Error;
xParseException.prototype.constructor = xParseException;
xParseException.prototype.name = "Thistle.ParseException";

function xTemplateDoesNotExist(message) {
    var err = new Error();

    if (err.stack) {
        this.stack = this.stack.split(/\n/)[0] + ": " + message + "\n" + err.stack.split(/\n/).slice(2).join("\n");
    }

    this.message = message;
}
xTemplateDoesNotExist.prototype = new Error;
xTemplateDoesNotExist.prototype.constructor = xTemplateDoesNotExist;
xTemplateDoesNotExist.prototype.name = "Thistle.TemplateDoesNotExist";
// xParseException.prototype.toString = function() { return "Thistle.ParseException: " + this.message; }

Thistle.Context = require('./context');

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
Thistle.TemplateDoesNotExist = xTemplateDoesNotExist;

Thistle._filters = {}

Thistle.prototype = {
    render : function(view) {
        // sys.puts('Doing render view = ' + view);
        var data;

        if (!(view instanceof Thistle.Context))
            view = new Thistle.Context(view);
        
        try {
            view.render_context.push();
            data = this._nodes.render(view || {});
            view.render_context.pop();
        } catch (e) {
            view.render_context.pop();
            // throw new Thistle.TemplateSyntaxError('no context');
            throw e;
        }

        return data;
    },
};

Thistle.SafeString = function(value) {
    value = value || "";
    this.length = value.length;
    this.valueOf = function() { return value; }
    this.toString = function() { return value; }
    this.is_safe = true;
}
Thistle.SafeString.prototype = new String;

Thistle.mark_safe = function(s) { 
    if (s instanceof Thistle.SafeString)
        return s;
    return new Thistle.SafeString(s); 
}

Thistle.tags = {};
Thistle.register_tags = function(tags) {
    for (var tag in tags) {
        Thistle.tags[tag] = tags[tag];
    }
}

Thistle.template_loaders = [
]


//
//
//
var Template = function(template_string, origin, name) {
    var Parser = require('./parser').Parser;
    var Lexer  = require('./lexer');

    var lexer  = new Lexer(template_string);
    var parser = new Parser(lexer.tokenize());

    this.nodelist = parser.parse();
    this.name     = name || 'UNKNOWN';
}

extend(Template, Object, {
    render: function(context) {
        context.render_context.push();
        var v = null;
        try {
            v = this._render(context);
        } catch(e) { }
        context.render_context.pop();
        return v;
    },

    _render: function(context) {
        return this.nodelist.render(context);
    },

    toString: function() {
        return '<Template ' + this.name + '>';
    },
});

Thistle.Template = Template;

var sys = require('sys');
var extend = require('./util');
var Thistle = require('./thistle');
var Node   = require('./parser').Node;

var CommentNode = function() { }

extend(CommentNode, Node, {
    render : function (context) { return ''; },
    toString : function() { return "<Comment Node>"; }
});

var CycleNode = function(cyclevars, variable_name, silent) { 
    this.cyclevars = cyclevars;
    this.variable_name = variable_name;
    this.silent = silent;
    this.ident  = 'CycleNode' + CycleNode.index++;
    this.pos = 0;
}
CycleNode.index = 100;

extend(CycleNode, Node, {
    render : function (context) { 
        if (typeof context.render_context[this.ident] == 'undefined')  {
            var self = this;
            context.render_context[this.ident] = function() {
                if (self.pos == self.cyclevars.length)
                    self.pos = 0;
                return self.cyclevars[self.pos++];
            }
        }
        cycle_iter = context.render_context[this.ident];
        value = cycle_iter().resolve(context);
        if (this.variable_name)
            context.set(this.variable_name, value);
        if (this.silent)
            return '';
        return value;
    },
    toString : function() { return "<Cycle Node>"; }
});

var DefaultTags = {
    comment : function(parser, token) {
        parser.skip_past('endcomment');
        return new CommentNode();
    },

    cycle : function(parser, token) {
        var args = token.split_contents()

        if (args.length < 2)
            throw new Thistle.TemplateSyntaxError("'cycle' tag requires at least two arguments");

        if (args[1].indexOf(',') != -1) {
            // Backwards compatibility: {% cycle a,b %} or {% cycle a,b as foo %} case.
            // sys.puts("ARGS = "+ args);
            // sys.puts("ARGS SPLIT = "+ args[1].split(','));
            args = [args[0]].concat(args[1].split(',').map(function (v) { return '"' + v + '"'; }), args.slice(2));
        }

        var name;

        if (args.length == 2) {
            // {% cycle foo %} case.
            name = args[1];

            if (typeof parser._namedCycleNodes == 'undefined')
                throw new Thistle.TemplateSyntaxError("No named cycles in template. '"+name+"' is not defined");;
            if (typeof parser._namedCycleNodes[name] == 'undefined')
                throw new Thistle.TemplateSyntaxError("Named cycle '"+name+"' does not exist");
            return parser._namedCycleNodes[name];
        }

        var as_form = false;
        var silent  = false;

        if (args.length > 4) {
            // {% cycle ... as foo [silent] %} case.
            if (args[args.length-3] == "as") {
                if (args[args.length-1] != "silent") {
                    throw new Thistle.TemplateSyntaxError("Only 'silent' flag is allowed after cycle's name, not '%s'." % args[-1]);
                }
                as_form = true;
                silent = true;
                args = args.slice(0, args.length-1);
            } else if (args[args.length-2] == "as") {
                as_form = true;
            }
        }

        var node = null;

        if (as_form) {
            name = args[args.length-1];
            var values = args.slice(1, args.length-2).map(function (arg) { return parser.compile_filter(arg); })
            node = new CycleNode(values, name, silent=silent);
            if (typeof parser._namedCycleNodes == 'undefined') 
                parser._namedCycleNodes = {}
            parser._namedCycleNodes[name] = node;
        } else {
            var values = args.slice(1).map(function (arg) { return parser.compile_filter(arg); })
            node = new CycleNode(values, null, false);
        }

        return node;
    }
};

module.exports = DefaultTags;

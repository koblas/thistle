var sys = require('sys');
var extend = require('./util');
var Thistle = require('./thistle');
var node   = require('./node');

var CommentNode = function() { }

extend(CommentNode, node.Node, {
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

extend(CycleNode, node.Node, {
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

//
//
//
var ForNode = function(loopvars, sequence, is_reversed, nodelist_loop, nodelist_empty) {
    this.child_nodelists = ['nodelist_loop', 'nodelist_empty']

    this.loopvars = loopvars;
    this.sequence = sequence;
    this.is_reversed = is_reversed;
    this.nodelist_loop = nodelist_loop;
    if (nodelist_empty == null || nodelist_empty == undefined) 
        this.nodelist_empty = new node.NodeList();
    else
        this.nodelist_empty = nodelist_empty;
}

extend(ForNode, node.Node, {
    render : function(context) {
        var  parentloop;

        if (context.has_key('forloop')) {
            parentloop = context['forloop'];
        } else {
            parentloop = {};
        }

        context.push();

        var values = null;
        try {
            values = this.sequence.resolve(context, true);
        } catch(e) {
        }

        if (values == null)
            values = [];

        if (values.length < 1) {
            context.pop();
            return self.nodelist_empty.render(context);
        }

        var nodelist = new node.NodeList();
        if (this.is_reversed)
            values = values.reverse();

        var loop_dict = { parentloop : parentloop };

        // Create a forloop value in the context.  We'll update counters on each
        // iteration just below.
        context.set('forloop', loop_dict);

        for (var i = 0; i < values.length; i++) {
            var  item = values[i];

            // sys.puts("item["+i+"] = " + item);

            loop_dict['counter0'] = i;
            loop_dict['counter'] = i+1;
            // Reverse counter iteration numbers.
            loop_dict['revcounter'] = values.length - i;
            loop_dict['revcounter0'] = values.length - i - 1;
            // Boolean values designating first and last times through loop.
            loop_dict['first'] = (i == 0);
            loop_dict['last'] = (i == values.length - 1);

            pop_context = false;

            context.set(this.loopvars[0], item);

            for (var idx = 0; idx < this.nodelist_loop.length; idx++) {
                nodelist.push(this.nodelist_loop[idx].render(context));
            }

            if (pop_context)
                context.pop();
        }

        context.pop();

        return nodelist.render(context);
    },
    toString : function() { return "<For Node>"; }
});

//
//
//
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
    },

    'for' : function(parser, token) {
        var bits = token.contents.split(/\s+/)

        if (bits.length < 4)
            throw new Thistle.TemplateSyntaxError("'for' statements should have at least four words: " + token.contents);

        var is_reversed = (bits[bits.length - 1] == 'reversed');
        var in_index = bits.length + (is_reversed ? -3 : -2);

        if (bits[in_index] != 'in')
            throw new Thistle.TemplateSyntaxError("'for' statements should use the format 'for x in y': " + token.contents);

        var loopvars = bits.slice(1, in_index).join(' ').split(/ *, */);
        for (var idx in loopvars) {
            var v = loopvars[idx];
            if (v.length == 0 || v.indexOf(' ') != -1)
                throw new Thistle.TemplateSyntaxError("'for' tag received an invalid argument: " + token.contents);
        }

        var sequence = parser.compile_filter(bits[in_index+1]);
        var nodelist_loop = parser.parse(['empty', 'endfor']);
        var nodelist_empty = null;

        token = parser.next_token();

        if (token.contents == 'empty') {
            nodelist_empty = parser.parse(['endfor'])
            parser.delete_first_token()
        }

        return new ForNode(loopvars, sequence, is_reversed, nodelist_loop, nodelist_empty);
    },
};

module.exports = DefaultTags;

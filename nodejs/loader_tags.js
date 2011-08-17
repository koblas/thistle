var sys     = require('sys');
var extend  = require('./util');
var Thistle = require('./thistle');
var nodes   = require('./node');
var token_kwargs = require('./token_kwargs');

var BLOCK_CONTEXT_KEY = 'block-context';

function make_origin(display_name, loader, name, dirs) {
    return {
        name: display_name,
        loader: loader,
        loadname: name,
        dirs: dirs,
    };
}

function find_template(name, dirs) {
    for (var i = 0; i < Thistle.template_loaders.length; i++) {
        var loader = Thistle.template_loaders[i];
        try {
            var vals = loader(name, dirs);
            return [vals[0], make_origin(vals[1], loader, name, dirs)];
        } catch(e) {
        }
    }
    throw new Thistle.TemplateDoesNotExist(name);
}

function get_template(template_name) {
    var vals = find_template(template_name);

    var template = vals[0];
    var origin   = vals[1];
    if (typeof template.render == 'unknown') 
        template = get_template_from_string(template, origin, template_name);
    return template;
}

function get_template_from_string(source, origin, name) {
    return new Thistle.Template(source, origin, name);
}

//
//
//
var BasicIncludeNode = function(extra_content, isolated_context) { 
    nodes.Node.apply(this, []);

    this.extra_content = extra_content;
    this.isolated_context = isolated_context;
}

extend(BasicIncludeNode, nodes.Node, {
    render: function (context) { return ''; },
    render_template: function(template, context) {
        var values = {};
        for (var name in this.extra_content) {
            values[name] = this.extra_content[name].resolve(context);
        }
        if (this.isolated_context) {
            var v = context.copy_new(values);
            return template.render(context.copy_new(values));
        }
        context.update(values);
        var output = template.render(context);
        context.pop();
        return output;
    },
    toString: function() { return "<BasicInclude Node>"; }
});

var ConstantIncludeNode = function(template_path, extra_content, isolated_context) { 
    BasicIncludeNode.apply(this, [extra_content, isolated_context]);
    this.template = null;
    try {
        this.template = get_template(template_path);
    } catch(e) {
        throw e;
        // TODO - if TEMPLATE_DEBUG
    }
}

extend(ConstantIncludeNode, BasicIncludeNode, {
    render : function(context) {
        return (this.template != null) ? this.render_template(this.template, context) : "";
    },
    toString : function() { return "<ConstantInclude Node>"; }
});

var IncludeNode = function(template_name, extra_content, isolated_context) {
    BasicIncludeNode.apply(this, [extra_content, isolated_context]);
    this.template_name = template_name;
}
extend(IncludeNode, BasicIncludeNode, {
    render : function(context) {
        try {
            var template_name = this.template_name.resolve(context);
            template = get_template(template_name);
            return this.render_template(template, context);
        } catch (e) {
            sys.puts(e);
            // TODO - if TEMPLATE_DEBUG
            return "";
        }
    },
    toString : function() { return "<Include Node>"; }
});

//
//
//
var BlockContext = function() {
    this.blocks = {};
}
extend(BlockContext, Object, {
    add_blocks: function(blocks) {
        for (var name in blocks) {
            if (this.blocks[name] == undefined)
                this.blocks[name] = [];
            this.blocks[name].unshift(blocks[name]);
        }
    },

    pop: function(name) {
        return this.blocks[name].pop();
    },

    push: function(name, block) {
        this.blocks[name].push(block);
    },

    get_block: function(name) {
        var b = this.blocks[name];
        if (b == undefined)
            return undefined;
        return b[b.length-1];
    },
});

var BlockNode = function(block_name, nodelist) { 
    nodes.Node.apply(this, []);

    this.name = block_name;
    this.nodelist = nodelist;
    this.context = undefined;
}

extend(BlockNode, nodes.Node, {
    render: function(context) {
        var block_context = context.render_context.get(BLOCK_CONTEXT_KEY);
        var result;

        context.push();
        if (block_context == null || block_context == undefined) {
            context.set('block', this);
            result = this.nodelist.render(context);
        } else {
            var push = block_context.pop(this.name);
            var block = push;

            if (block == undefined)
                block = this;

            block = new BlockNode(block.name, block.nodelist);
            block.context = context;
            context.set('block', block);
            result = block.nodelist.render(context);
            if (push != undefined)
                block_context.push(this.name, push);
        }
        context.pop();
        return result;
    },

    super: function() {
        var render_context = this.context.render_context;
        if (render_context.get(BLOCK_CONTEXT_KEY) != undefined && render_context.get(BLOCK_CONTEXT_KEY).get_block(this.name) != undefined)
            return Thistle.mark_safe(this.render(this.context));
        return '';
    },

    toString : function() { return "<Block Node: "+this.name+">"; }
});

var ExtendsNode = function(nodelist, parent_name, parent_name_expr, template_dirs) { 
    nodes.Node.apply(this, []);

    this.nodelist = nodelist;
    this.parent_name = parent_name;
    this.parent_name_expr = parent_name_expr;
    this.template_dirs = template_dirs || null;
    this.blocks = {}
    var self = this;
    nodelist.get_nodes_by_type(BlockNode).map(function (n) { self.blocks[n.name] = n; });
}

extend(ExtendsNode, nodes.Node, {
    get_parent: function(context) {
        if (this.parent_name_expr != null) 
            this.parent_name = this.parent_name_expr.resolve(context);
        var parent = this.parent_name;
        if (parent == null || parent == undefined) {
            error_msg = "Invalid template name in 'extends' tag: "  + parent
            if (this.parent_name_expr != null)
                error_msg += " Got this from '" + this.parent_name_expr.token + "' variable";
            throw new Thistle.TemplateSyntaxError(error_msg);
        }
        if (parent.render != undefined)
            return parent;  // parent is a Template object
        return get_template(parent);
    },

    render: function(context) {
        var compile_parent = this.get_parent(context);

        if (context.render_context.get(BLOCK_CONTEXT_KEY) == undefined) {
            context.render_context.set(BLOCK_CONTEXT_KEY, new BlockContext());
        }
        var block_context = context.render_context.get(BLOCK_CONTEXT_KEY);

        // Add the block nodes from this node to the block context
        block_context.add_blocks(this.blocks);

        // If this block's parent doesn't have an extends node it is the root,
        // and its block nodes also need to be added to the block context.
        for (var i = 0; i < compile_parent.nodelist.length; i++) {
            var node = compile_parent.nodelist[i];
            if (!(node instanceof nodes.TextNode)) {
                if (!(node instanceof ExtendsNode)) {
                    var blocks = {};
                    compile_parent.nodelist.get_nodes_by_type(BlockNode).map(function (n) { blocks[n.name] = n; });
                    block_context.add_blocks(blocks);
                }
                break;
            }
        }
        return compile_parent._render(context);
    },
    toString : function() { return "<Extends Node>"; }
});

//
//
//
Thistle.register_tags({
    'include' : function(parser, token) {
        var bits = token.split_contents();
        if (bits.length < 2) 
            throw new Thistle.TemplateSyntaxError(bits[0] + " tag takes at least one argument: the name of the template to be included.");

        var options = {};
        var remaining_bits = bits.slice(2);
        while (remaining_bits.length != 0) {
            var option = remaining_bits.shift();
            if (options[option] != undefined) 
                throw new Thistle.TemplateSyntaxError("The " + option + " was specified more than once.");
            if (option == 'with') {
                value = token_kwargs(remaining_bits, parser, false);
                if (value == null) 
                    throw new Thistle.TemplateSyntaxError('"with" in ' + bits[0] + " tag needs at least one keyword argument.");
            } else if (option == 'only') {
                value = true;
            } else {
                throw new Thistle.TemplateSyntaxError("Unknown argument for " + bits[0] + " tag: " + option);
            }
            options[option] = value;
        }


        var isolated_context = options['only'] || false;
        var namemap = options['with'] || {};
        var path = bits[1];

        if ((path[0] == '"' || path[0] == '\'') && path.substring(path.length-1) == path[0]) {
            return new ConstantIncludeNode(path.substring(1, path.length-1), namemap, isolated_context);
        }
        return new IncludeNode(parser.compile_filter(bits[1]), namemap, isolated_context);
    },

    'block' : function(parser, token) {
        bits = token.split_contents();

        if (bits.length < 2) 
            throw new Thistle.TemplateSyntaxError(bits[0] + " tag takes at least one argument");

        var block_name = bits[1];
        // Keep track of the names of BlockNodes found in this template, so we can
        // check for duplication.
        if (parser.__loaded_blocks == undefined)
            parser.__loaded_blocks = {};

        if (parser.__loaded_blocks[block_name] != undefined)
            throw new Thistle.TemplateSyntaxError("'"+bits[0]+"' tag with name '"+block_name+"' appears more than once");
            
        var nodelist = parser.parse(['endblock', 'endblock ' + block_name]);
        parser.delete_first_token();
        return new BlockNode(block_name, nodelist);
    },

    'extends' : function(parser, token) {
        bits = token.split_contents();

        if (bits.length != 2) 
            throw new Thistle.TemplateSyntaxError(bits[0] + " takes one argument");

        var parent_name = null;
        var parent_name_expr = null;

        if ((bits[1][0] == '"' || bits[1][0] == '\'') && bits[1].substring(bits[1].length-1, 1) == bits[1][0]) {
            parent_name = bits[1].substring(1, bits[1].length-1);
        } else {
            parent_name_expr = parser.compile_filter(bits[1]);
        }

        nodelist = parser.parse();
        if (nodelist.get_nodes_by_type(ExtendsNode).length != 0)
            throw new Thistle.TemplateSyntaxError(bits[0] + " cannot appear more than once in the same template");
        return new ExtendsNode(nodelist, parent_name, parent_name_expr);
    },
});

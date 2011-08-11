var sys = require('sys');
var extend = require('./util');
var Thistle = require('./thistle');

function mark_safe(s) {
    s.is_safe = true;
    return s;
}

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
    this.contains_nontext = false;
}

extend(NodeList, Array, {
    render_node : function(node, context) {
        return node.render(context);
    },
        
    render : function(context) {
        var t = this;
        var bits = this.map(function(node) {
            if (node instanceof Node) {
                // sys.puts("NodeList context = " + context);
                return t.render_node(node, context);
            } else {
                return node;
            }
        });

        return mark_safe(bits.join(''));
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
    },

    toString : function() {
        str = "<NodeList contains_nontext="+this.contains_nontext+" len="+this.length+" [";
        for (var i = 0; i < this.length; i++) {
            str += (i != 0 ? ", " : "");
            str += this[i];
        }
        return str + "]>";
    },
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
        function in_context(value, context, is_safe) {
            if (value == undefined)
                return "";
            if (context.autoescape) {
                if (value instanceof Thistle.SafeString || value.is_safe || is_safe)
                    return value;
                return new Thistle.SafeString(value.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            }
            return value;
        };

        var output = this.filter_expression.resolve(context);

        return in_context(output, context);
    }
});

module.exports = {
    Node         : Node,
    NodeList     : NodeList,
    TextNode     : TextNode,
    VariableNode : VariableNode,
};

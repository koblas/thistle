
class VariableNode extends Node {
    FilterExpression  filter_expression;

    public VariableNode(FilterExpression filter_expression) {
        this.filter_expression = filter_expression;
        must_be_first = false;
    }

    public String toString() {
        return "<Variable Node: " + this.filter_expression + ">";
    }

    public String render(Context c) {
        Object  o = filter_expression.resolve(c);

        if (c.autoescape && o instanceof String)
            return Util.escape((String)o);
        return (String)o;
    }
}

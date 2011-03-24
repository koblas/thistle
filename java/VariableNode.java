
class VariableNode extends Node {
    String  filter_expression;

    public VariableNode(String filter_expression) {
        this.filter_expression = filter_expression;
        must_be_first = false;
    }

    public String toString() {
        return "<Variable Node: " + this.filter_expression + ">";
    }

    public String render(Context c) {
        /*
        var output = this.filter_expression.resolve(context);

        return in_context(output, context);
        */
        return "TODO_VARIABLE_RENDER";
    }
}

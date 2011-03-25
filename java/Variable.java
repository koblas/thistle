import java.lang.Integer;
import java.lang.Double;

class Variable {
    private enum ValueType {
        UNDEF, DOUBLE, INTEGER, STRING, VARIABLE
    };

    private ValueType type = ValueType.UNDEF;
    private boolean   translate = false;

    private double  d_literal;
    private int     i_literal;
    private String  literal;

    public Variable(String var) {
        if (type == ValueType.UNDEF) {
            try {
                d_literal = Double.parseDouble(var);
                literal = var;
                type = ValueType.DOUBLE;
            } catch (java.lang.NumberFormatException e) { }
        }
        if (type == ValueType.UNDEF) {
            try {
                i_literal = Integer.parseInt(var);
                literal = var;
                type = ValueType.INTEGER;
            } catch (java.lang.NumberFormatException e) { }
        }
        if (type == ValueType.UNDEF) {
            if ((var.startsWith("\"") && var.endsWith("\"")) || (var.startsWith("\"") && var.endsWith("\""))) {
                literal = var.substring(1, var.length() - 1);
                type = ValueType.STRING;
            }
        }
        if (type == ValueType.UNDEF) {
            literal = var;
            type = ValueType.VARIABLE;
        }
    }

    public String resolve(Context c) {
        String  value;

        if (type == ValueType.VARIABLE) {
            value = c.resolve(literal);
        } else {
            value = literal;
        }
        if (translate) {
            // translate value
        }
        return value;
    }
}

import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class FilterExpression {

    static String  FILTER_SEPARATOR = "|";
    static String  FILTER_ARGUMENT_SEPARATOR = ":";

    private String   token;
    private Variable var;

    public FilterExpression(String token, Parser parser) throws TemplateSyntaxError {
        this.token = token;

        parse(token.trim());
    }

    // Sigh - no name expression so build by hand...
    private int p_idx;
    
    private void parse(String expr) throws TemplateSyntaxError {
        String  tok;

        p_idx = 0;

        // Parse the first part, either constant (quoted string), number or variable
        //
        if ((tok = parse_get_constant(expr)) != null) {
            var = new Variable(tok);
        } else if ((tok = parse_get_val(expr)) != null) {
            var = new Variable(tok);
        } else if ((tok = parse_get_num(expr)) != null) {
            var = new Variable(tok);
        } else {
            throw new TemplateSyntaxError("Bad start of expression");
        }

        // parse_filter(expr.substring(p_idx));
    }

    private String parse_get_constant(String expr) throws TemplateSyntaxError {
        if (p_idx >= expr.length())
            return null;

        int     sidx = p_idx;
        char    c = expr.charAt(p_idx);

        if (c == '"' || c == '\'') {
            for (p_idx ++; p_idx < expr.length() && expr.charAt(p_idx) != c; p_idx++)
                ;
            if (p_idx == expr.length()) 
                throw new TemplateSyntaxError("Invalid constant");

            p_idx++;
            return expr.substring(sidx+1, p_idx);
        }
        return null;
    }

    static Pattern num_re = Pattern.compile("^[-+\\.]?\\d[\\d\\.e]*");
    static Pattern var_re = Pattern.compile("^[\\w.]+");

    private String parse_use_re(String expr, Matcher matcher) {
        if (!matcher.find(p_idx)) 
            return null;

        int sidx = p_idx;
        int eidx = matcher.end();
        p_idx = eidx;

        return expr.substring(sidx, eidx);
    }

    private String parse_get_num(String expr) {
        return parse_use_re(expr, num_re.matcher(expr));
    }
    
    private String parse_get_val(String expr) {
        return parse_use_re(expr, var_re.matcher(expr));
    }

    private void parse_filter(String expr) {
        /*
        if (idx == expr.length())
            return;
        if (expr.charAt(idx) != FILTER_SEPARATOR) 
            throw new TemplateSyntaxError("Invalid filter specification");
        // TODO - work
        */
    }
    
    public String resolve(Context c) {
        String value = var.resolve(c);

        // TODO - pass through filters...

        return value;
    }
}

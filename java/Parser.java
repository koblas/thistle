import java.util.LinkedList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

public class Parser {
    private List<Token> tokens;
    private List<String>    parse_until;
    private HashMap<String, TagHandler> tags;
    private HashMap<String, FilterHandler> filters;

    public Parser(List<Token> tokens) {
        this.tokens = tokens;

        tags = new HashMap<String, TagHandler>();
        filters = new HashMap<String, FilterHandler>();

        // TODO add built in libraries
    }

    public NodeList parse() throws TemplateSyntaxError {
        return parse(null);
    }

    public NodeList parse(List<String> _parse_until) throws TemplateSyntaxError {
        if (_parse_until == null)
            parse_until = new LinkedList<String>();

        NodeList    nodelist = create_nodelist();

        // for (Token t : tokens) System.out.println(t);

        while (!tokens.isEmpty()) {
            Token token = next_token();

            if (token.type == Token.Type.TOKEN_TEXT) {
                extend_nodelist(nodelist, new TextNode(token.contents), token);
            } else if (token.type == Token.Type.TOKEN_VAR) {
                if (token.empty()) 
                    empty_variable(token);

                VariableNode var_node = create_variable_node(compile_filter(token));

                extend_nodelist(nodelist, var_node, token);
            } else if (token.type == Token.Type.TOKEN_BLOCK) {
                for (String s : parse_until) {
                    if (s.equals(token.contents)) {
                        // put token back on token list so calling code knows why it terminated
                        prepend_token(token);
                    }
                    return nodelist;
                }

                String command = null;
                try {
                    command = token.contents.split(" ")[0];
                } catch (Exception e) {
                    empty_block_tag(token);
                }

                // execute callback function for this tag and append resulting node
                enter_command(command, token);

                if (!tags.containsKey(command))
                    invalid_block_tag(token, command, parse_until);
                TagHandler handler = tags.get(command);

                Node    compiled_result = null;
                try {
                    compiled_result = handler.compile(token);
                } catch (TemplateSyntaxError e) {
                    if (compile_function_error(token, e))
                        throw e;
                }

                extend_nodelist(nodelist, compiled_result, token);
                exit_command();
            }
        }

        if (!parse_until.isEmpty()) 
            unclosed_block_tag(parse_until);

        return nodelist;
    }

    private NodeList create_nodelist() {
        return new NodeList();
    }

    private VariableNode create_variable_node(FilterExpression expr) {
        return new VariableNode(expr);
    }

    public void empty_block_tag(Token token) throws TemplateSyntaxError {
        throw new TemplateSyntaxError("Empty block tag", token);
    }

    public void empty_variable(Token token) throws TemplateSyntaxError {
        throw new TemplateSyntaxError("Empty variable tag", token);
    }

    public void unclosed_block_tag(String tag) throws TemplateSyntaxError {
        List<String>    l = new LinkedList<String>();
        l.add(tag);
        unclosed_block_tag(l);
    }

    public void unclosed_block_tag(List<String> parse_until) throws TemplateSyntaxError {
        StringBuffer    buf = new StringBuffer();
        for (String s : parse_until) {
            if (buf.length() != 0)
                buf.append(", ");
            buf.append(s);
        }
        throw new TemplateSyntaxError("Unclosed tags: " + buf.toString());
    }

    private void extend_nodelist(NodeList nodelist, Node node, Token token) throws TemplateSyntaxError {
        if (node.must_be_first && !nodelist.isEmpty()) {
            if (nodelist.contains_nontext) {
                throw new TemplateSyntaxError(node + " must be the first tag in the template.");
            }
        }
        if (nodelist instanceof NodeList) 
            nodelist.contains_nontext = true;
        nodelist.add(node);
    }

    private void prepend_token(Token token) {
        tokens.add(0, token);
    }

    private Token next_token() {
        return tokens.remove(0);
    }

    private void enter_command(String command, Token token) {
        // Nothing
    }

    private void exit_command() {
        // Nothing
    }

    private boolean compile_function_error(Token token, Exception e) {
        return false;
    }

    private FilterExpression compile_filter(Token token) throws TemplateSyntaxError {
        // Convenient wrapper for FilterExpression
        return new FilterExpression(token.contents, this);
    }

    private void invalid_block_tag(Token token, String command, List<String> parse_until) throws TemplateSyntaxError {
        if (parse_until != null && !parse_until.isEmpty()) {
            StringBuffer    sbuf = new StringBuffer();

            for (String s : parse_until) {
                if (sbuf.length() != 0) 
                    sbuf.append(", ");
                sbuf.append("'");
                sbuf.append(s);
                sbuf.append("'");
            }

            throw new TemplateSyntaxError("Invalid block tag: '"+command+"', expected " + sbuf.toString());
        }
        throw new TemplateSyntaxError("Invalid block tag: '" + command +"'", token);
    }

    private void delete_first_token() {
        tokens.remove(0);
    }
    
    private void skip_past(String endtag) throws TemplateSyntaxError {
        while (!tokens.isEmpty()) {
            Token token = next_token();
            if (token.type == Token.Type.TOKEN_BLOCK && endtag.equals(token.contents))
                return;
        }
        unclosed_block_tag(endtag);
    }


/*
    def add_library(self, lib):
        self.tags.update(lib.tags)
        self.filters.update(lib.filters)
*/

    public FilterHandler find_filer(String filter_name) throws TemplateSyntaxError {
        FilterHandler f = filters.get(filter_name);
        if (f == null)
            throw new TemplateSyntaxError("Invalid filter: '" + filter_name + "'");
        return f;
    }
}

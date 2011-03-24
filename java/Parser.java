import java.util.List;

public class Parser {
    private List<Token> tokens;

    public Parser(List<Token> tokens) {
        this.tokens = tokens;

        // tags = new Map<String, TagHandler>();
        // filters = new Map<String, FilterHandler>();

        // TODO add built in libraries
    }

    public parse() {
        return parse(null);
    }

    public parse(String[] parse_until) {
        if (parse_until == null)
            parse_until = new String[0];

        NodeList    nodelist = create_nodelist();

        while (tokens.hasNext()) {
            token = tokens.next();

            if (token.type == Token.Type.TOKEN_TEXT) {
                extend_nodelist(nodelist, TextNode(token.contents), token);
            } else if (token.type == Token.Type.TOKEN_VAR) {
                if (token.empty()) 
                    empty_variable(token)

                VariableNode var_node = create_variable_node(compile_filter(token.contents))

                extend_nodelist(nodelist, var_node, token)
            } else if (token.token_type == Token.Type.TOKEN_BLOCK) {
                for (String s : parse_until) {
                    if (s.equals(token.contents)) {
                        // put token back on token list so calling code knows why it terminated
                        prepend_token(token)
                    }
                    return nodelist
                }

                try:
                    command = token.contents.split()[0]
                except IndexError:
                    empty_block_tag(token)

                // execute callback function for this tag and append resulting node
                enter_command(command, token)
                try:
                    compile_func = self.tags[command]
                except KeyError:
                    self.invalid_block_tag(token, command, parse_until)
                try:
                    compiled_result = compile_func(self, token)
                except TemplateSyntaxError, e:
                    if not self.compile_function_error(token, e):
                        raise

                extend_nodelist(nodelist, compiled_result, token)
                exit_command()
            }
        }

        if (parse_until.length() != 0) {
            unclosed_block_tag(parse_until)
        }

        return nodelist;
    }

    private NodeList create_nodelist() {
        return new NodeList()
    }

    private VariableNode create_variable_node(FilterExpression expr) {
        return new VariableNode(expr)
    }

    public void empty_variable(Token token) raises TemplateSyntaxError {
        raise TemplateSyntaxError("Empty variable tag", token);
    }

    public void empty_block_tag(Token token) raises TemplateSyntaxError {
        raise TemplateSyntaxError("Empty block tag", token);
    }

    public void empty_variable(Token token) raises TemplateSyntaxError {
        raise TemplateSyntaxError("Empty variable tag", token);
    }

    public void unclosed_block_tag(NodeList parse_until) raises TemplateSyntaxError {
        raise TemplateSyntaxError(None, "Unclosed tags: %s " %  ', '.join(parse_until))
    }

    private void extend_nodelist(NodeList nodelist, Node node, Token token) {
        if (node.must_be_first and nodelist.length() != 0) {
            if (nodelist.contains_nontext) {
                raise TemplateSyntaxError("%r must be the first tag in the template." % node)
            }
        }
        if (nodelist isinstance NodeList) 
            nodelist.contains_nontext = true;
        nodelist.add(node);
    }

    private void prepend_token(Token token) {
        tokens.insert(0, token)
    }

    private Token next_token() {
        return tokens.pop(0)
    }

    private void enter_command(command, Token token) {
        // Nothing
    }

    private void exit_command() {
        // Nothing
    }

    private boolean compile_function_error(Token token, Exception e) {
        return false;
    }

    private FilterExpression compile_filter(Token token) {
        // Convenient wrapper for FilterExpression
        return FilterExpression(token, this)
    }


/*
    def parse(self, parse_until=None):
        if parse_until is None: parse_until = []

        return nodelist

    def skip_past(self, endtag):
        while self.tokens:
            token = self.next_token()
            if token.token_type == TOKEN_BLOCK and token.contents == endtag:
                return
        self.unclosed_block_tag([endtag])

    def invalid_block_tag(self, token, command, parse_until=None):
        if parse_until:
            raise self.error(token, "Invalid block tag: '%s', expected %s" % (command, get_text_list(["'%s'" % p for p in parse_until])))
        raise self.error(token, "Invalid block tag: '%s'" % command)

    def delete_first_token(self):
        del self.tokens[0]

    def add_library(self, lib):
        self.tags.update(lib.tags)
        self.filters.update(lib.filters)

    def find_filter(self, filter_name):
        if filter_name in self.filters:
            return self.filters[filter_name]
        else:
            raise TemplateSyntaxError("Invalid filter: '%s'" % filter_name)
*/
}

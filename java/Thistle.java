
public class Thistle {
    private Lexer lexer; 
    private Parser parser;
    private NodeList nodes;

    public Thistle(String content) throws TemplateSyntaxError {
        lexer = new Lexer(content, null);
        parser = new Parser(lexer.tokenize());
        nodes = parser.parse();
    }

    public String render(Context c) {
        return nodes.render(c);
    }
}

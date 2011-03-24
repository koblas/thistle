
public class Thistle {
    private Lexer lexer; 
    private Parser parser;

    public Thistle(String content) {
        lexer = new Lexer(content, null);
        parser = new Parser(lexer.tokenize());
    }

    public String render() {
        return "TODO - NO YET IMPLEMENTED";
    }
}

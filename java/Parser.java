java.util.List;

public class Parser {
    private List<Token> tokens;

    public class Parser(List<Token> tokens) {
        this.tokens = tokens;
        this.tags   = null;
        this.filters = null;

        // TODO add built in libraries
    }
}

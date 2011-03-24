import java.util.regex.Pattern;
import java.util.LinkedList;
import java.util.List;
import java.lang.String;

class Lexer {
    static String   BLOCK_TAG_START    = "{%";
    static String   BLOCK_TAG_END      = "%}";
    static String   VARIABLE_TAG_START = "{{";
    static String   VARIABLE_TAG_END   = "}}";
    static String   COMMENT_TAG_START  = "{#";
    static String   COMMENT_TAG_END    = "#}";

    private static Pattern tag_re = null;

    static String escape_re(String s) {
        return s.replace("{", "\\{").replace("}","\\}");
    }

    static {
        tag_re = Pattern.compile("("
                                 + escape_re(BLOCK_TAG_START) + ".*?" + escape_re(BLOCK_TAG_END)
                                 + "|"
                                 + escape_re(VARIABLE_TAG_START) + ".*?" + escape_re(VARIABLE_TAG_END)
                                 + "|"
                                 + escape_re(COMMENT_TAG_START) + ".*?" + escape_re(COMMENT_TAG_END)
                                 + ")");
    }

    private String template_string;
    private String origin;
    private int lineno;

    public Lexer(String template_string, String origin) {
        this.template_string = template_string;
        this.origin = origin;
        lineno = 1;
    }

    public List<Token> tokenize() {
        boolean in_tag = false;

        List<Token> result = new LinkedList<Token>();

        for (String bit : tag_re.split(template_string)) {
            if (bit != null) {
                result.add(create_token(bit, in_tag));
                in_tag = !in_tag;
            }
        }

        return result;
    }

    private Token create_token(String token_string, Boolean in_tag) {
        if (in_tag) {
            if (token_string.startsWith(VARIABLE_TAG_START)) {
                // sys.puts("VARIABLE .... " + token_string);
                return new Token(Token.Type.TOKEN_VAR, token_string.substring(VARIABLE_TAG_START.length(),
                                                  token_string.length() - VARIABLE_TAG_START.length() - VARIABLE_TAG_END.length()).trim());
            }
            if (token_string.startsWith(BLOCK_TAG_START)) {
                return new Token(Token.Type.TOKEN_BLOCK, token_string.substring(BLOCK_TAG_START.length(),
                                                  token_string.length() -  BLOCK_TAG_START.length() - BLOCK_TAG_END.length()).trim());
            }
            if (token_string.startsWith(COMMENT_TAG_START)) {
                return new Token(Token.Type.TOKEN_COMMENT, "");
            }
        } else {
            return new Token(Token.Type.TOKEN_TEXT, token_string);
        }
        // TODO Throw
        return null;
    }
}

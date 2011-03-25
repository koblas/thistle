import java.util.regex.Pattern;
import java.util.regex.Matcher;
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

    static {
        tag_re = Pattern.compile("("
                                  + Pattern.quote(BLOCK_TAG_START) + ".*?" + Pattern.quote(BLOCK_TAG_END)
                               + "|"
                                  + Pattern.quote(VARIABLE_TAG_START) + ".*?" + Pattern.quote(VARIABLE_TAG_END)
                               + "|"
                                 + Pattern.quote(COMMENT_TAG_START) + ".*?" + Pattern.quote(COMMENT_TAG_END)
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

        Matcher matcher = tag_re.matcher(template_string);

        int     sidx = 0;
        while (matcher.find()) {
            /*
            System.out.println("SIDX  = " + sidx);
            System.out.println("START = " + matcher.start());
            System.out.println("GROUP = " + matcher.group());
            System.out.println("END   = " + matcher.end());
            */

            if (matcher.start() != sidx)
                result.add(create_token(template_string.substring(sidx, matcher.start()), false));
            result.add(create_token(matcher.group(), true));
            sidx = matcher.end();
        }
        if (sidx != template_string.length())
            result.add(create_token(template_string.substring(sidx), false));

        return result;
    }

    private Token create_token(String token_string, Boolean in_tag) {
        if (in_tag) {
            if (token_string.startsWith(VARIABLE_TAG_START)) {
                // sys.puts("VARIABLE .... " + token_string);
                return new Token(Token.Type.TOKEN_VAR, token_string.substring(VARIABLE_TAG_START.length(),
                                                  token_string.length() - VARIABLE_TAG_END.length()).trim());
            }
            if (token_string.startsWith(BLOCK_TAG_START)) {
                return new Token(Token.Type.TOKEN_BLOCK, token_string.substring(BLOCK_TAG_START.length(),
                                                  token_string.length() -  BLOCK_TAG_END.length()).trim());
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

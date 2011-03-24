import java.util.LinkedList;
import java.util.List;
import java.lang.String;
import java.util.regex.Pattern;

public class Token {
    // PYTHON VERSION var RE = /([^\s"]*"(?:[^"\\]*(?:\\.[^"\\]*)*)"\S*|[^\s']*'(?:[^'\\]*(?:\\.[^'\\]*)*)'\S*|\S+)/;

    // private static Pattern SPLIT_RE = Pattern.compile("([^\\s\"]*\"(?:[^\"\\\\]*(?:\\\\.[^\"\\]*)*)\"\\S*|[^\\s']*'(?:[^'\\\\]*(?:\\\\.[^'\\\\]*)*)'\\S*|\\S+)");
    private static Pattern SPLIT_RE = Pattern.compile("([^\\s\"]*\""
                                                     +"(?:[^\"\\\\]*"
                                                       +"(?:\\\\.[^\"\\\\]*)"
                                                     +"*)\"\\S*|[^\\s']*'"
                                                     +"(?:[^'\\\\]*"
                                                       +"(?:\\\\.[^'\\\\]*)"
                                                     +"*)'\\S*|\\S+)");

    enum Type {
        TOKEN_TEXT,
        TOKEN_VAR,
        TOKEN_BLOCK,
        TOKEN_COMMENT,
    };

    private Type    type;
    public String   contents;
    private int     lineno = -1;


    public Token(Type token_type, String token_contents) {
        type = token_type;
        contents = token_contents;
    }

    public String toString() {
        int maxl = contents.length();
        if (maxl > 20) 
            maxl = 20;
        return "<" + type + " token: \"" + contents.substring(0,maxl).replaceAll("\n", " ") + "\"...>";
    }

    public List<String> split_contents() {
        List<String>    split = new LinkedList<String>();

        String[]            bits = SPLIT_RE.split(contents);
        int                 idx = 0;

        while (idx < bits.length) {
            String  bit = bits[idx++];
            // Handle trnaslation-marked template pieces

            if (bit.startsWith("_(\"") || bit.startsWith("_('")) {
                    List<String>    trans_bit = new LinkedList<String>();
                    String    sentinal = bit.charAt(2) + ")";
                    
                    while (!bit.endsWith(sentinal) && idx < bits.length) {
                        bit = bits[idx++];
                        trans_bit.add(bit);
                    }
                    // Join it up...  maybe should be in the the above loop...
                    StringBuffer    sbuf = new StringBuffer();
                    for (String s : trans_bit) {
                        sbuf.append(s);
                        sbuf.append(' ');
                    }
                    bit = sbuf.toString();
            }
            split.add(bit);
        }

        return split;
    }

    public boolean empty() {
        return contents == null || contents.length() == 0; 
    }
}

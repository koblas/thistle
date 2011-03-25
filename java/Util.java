import java.io.StringWriter;

class Util {
    static public String    escape(String s) {
        StringWriter    writer = new StringWriter((int)(s.length() * 1.5));

        for (int i = 0; i < s.length(); i++) {
            char    c = s.charAt(i);
            switch (c) {
            case '&': writer.append("&amp;"); break;
            case '<': writer.append("&lt;"); break;
            case '>': writer.append("&gt;"); break;
            case '\"': writer.append("&quote;"); break;
            case '\u00ae': writer.append("&#174;"); break;
            case '\u00a9': writer.append("&#169;"); break;
            default: writer.append(c); break;
            }
        }
        return writer.toString();
    }
}

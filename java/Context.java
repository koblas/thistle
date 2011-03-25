import java.util.HashMap;
import java.util.Map;
import java.lang.String;

public class Context {
    public boolean                  autoescape = true;
    private Map<String, String>     data = new HashMap<String,String>();;

    public Object get(String s) {
        if ("name".equals(s))
            return "World";
        return null;
    }

    public String resolve(String var) {
        if ("name".equals(var))
            return "World";
        return null;
    }
}

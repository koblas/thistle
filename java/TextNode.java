class TextNode extends Node {
    String  body;

    public TextNode(String s) {
        must_be_first = false;
        body = s;
    }

    public String toString() {
        return "<Text Node: '" + body.substring(0, body.length() < 25 ? body.length() : 25) + "'>";
    }

    public String render(Context c) {
        return body;
    }
}

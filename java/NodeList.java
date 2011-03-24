import java.util.List;
import java.util.LinkedList;
import java.lang.StringBuffer;

class NodeList extends Node {
    public boolean contains_nontext = false;
    public List<Node>   nodes = new LinkedList<Node>();

    public NodeList() {
    }

    public String render_node(Node node, Context c) {
        return node.render(c);
    }

    public String render(Context c) {
        StringBuffer    buffer = new StringBuffer();

        for (Object node : nodes) {
            if (node instanceof Node) {
                buffer.append(render_node((Node)node, c));
            } else {
                buffer.append((String)node);
            }
        }
        
        return buffer.toString();
    }

    protected List<Node> get_nodes_by_type(Node nodetype) {
        List<Node>  nlist = new LinkedList<Node>();

        for (Node n : nodes) {
            for (Node item : n.get_nodes_by_type(nodetype)) {
                nodes.add(item);
            }
        }

        return nlist;
    }
}

import java.util.List;
import java.util.LinkedList;

abstract class Node {
    boolean must_be_first = false;
    List<Node>  nodelist  = null;

    public String render(Context c) {
        // TODO - throw not implemented
        return "";
    }

    protected List<Node> get_nodes_by_type(Node nodetype) {
        // TODO - The python implementiaon does a class level matching...

        LinkedList<Node>    nodes = new LinkedList<Node>();

        /* TODO
        if (this instanceof nodetype)
            nodes.add(this);
        */

        if (nodelist != null) {
            for (Node n : nodelist) {
                for (Node child : n.get_nodes_by_type(nodetype)) 
                    nodes.add(child);
            }
        }

        return nodes;
    }
}

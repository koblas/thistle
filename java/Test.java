import java.lang.String;
import java.io.FileReader;

class Test {
    static public void main(String argv[]) {
        for (int i = 0; i < argv.length; i++) {
            try {
                /*
                byte[]  bdata = new byte[8192];
                FileReader  reader = new FileReader(argv[i]);

                reader.read(bdata);
                */

                Thistle thistle = new Thistle("Hello World");
                // Thistle thistle = new Thistle(data.toString());
                System.out.print(thistle.render());
            // } catch (java.io.IOException e) {
            } finally {
            }
            //sys.puts(thistle.render({name: 'world'}));
        }
    }
}

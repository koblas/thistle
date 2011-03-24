import java.lang.String;
import java.io.FileInputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.StringBuilder;

class Test {
    static public void main(String argv[]) {
        for (int i = 0; i < argv.length; i++) {
            StringBuilder builder = new StringBuilder();
            FileInputStream fin = null;

            try {
                fin = new FileInputStream(argv[i]);
                BufferedReader  reader = new BufferedReader(new InputStreamReader(fin));
                char[]          buf = new char[8192];
                int             nchar;

                while ((nchar = reader.read(buf, 0, buf.length)) > 0) 
                    builder.append(buf, 0, nchar);

                Thistle thistle = new Thistle(builder.toString());
                System.out.print(thistle.render());
            } catch (java.io.IOException e) {
            } finally {
                try {
                    fin.close();
                } catch(java.io.IOException e) {}
            }
            //sys.puts(thistle.render({name: 'world'}));
        }
    }
}

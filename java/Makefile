JSRC = Test.java Lexer.java Token.java Thistle.java  Parser.java Node.java NodeList.java TextNode.java VariableNode.java

JOBJ = $(JSRC:%.java=%.class)

thistle.jar : $(JOBJ)
	#jar cmf MANIFEST.MF thistle.jar $(JOBJ) Token$$Type.class foo.bar
	jar cmf MANIFEST.MF thistle.jar *.class

.java.class:
	javac $<

.SUFFIXES: .class .java

clean: 
	$(RM) *.class thistle.jar

all: thistle.jar

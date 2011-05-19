JSRC = Test.java Lexer.java Token.java Thistle.java  Parser.java Node.java NodeList.java TextNode.java VariableNode.java Util.java \
			FilterExpression.java Variable.java


JOBJ = $(JSRC:%.java=%.class)

thistle.jar : $(JOBJ)
	jar cmf MANIFEST.MF thistle.jar $(JOBJ) 
	#jar cmf MANIFEST.MF thistle.jar $(JOBJ) Token$$Type.class foo.bar
	#cp jregex1.2_01.jar thistle.jar
	#jar umf MANIFEST.MF thistle.jar *.class

.java.class:
	#javac -cp .:jregex1.2_01.jar $<
	javac $<

.SUFFIXES: .class .java

clean: 
	$(RM) *.class thistle.jar

all: thistle.jar

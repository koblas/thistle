JSRC = Test.java

JOBJ = $(JSRC:%.java=%.class)

thistle.jar : $(JOBJ)
	jar cmf MANIFEST.MF thistle.jar $(JOBJ) 

.java.class:
	javac $<

.SUFFIXES: .class .java

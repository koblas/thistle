#!/usr/bin/python

from django.template import Lexer, Parser

text = "Hello {{77|lower}} {{name}} {% if name == 'world' %} in the world {% endif %}";

lexer = Lexer(text, None)
for t in lexer.tokenize() :
    print t
parser = Parser(lexer.tokenize())

print parser.parse()


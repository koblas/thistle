#!/usr/bin/python

from django.template import Lexer, Parser

text = "Hello {{77|lower}} {{name}} {% if name == 'world' %} in the world {% endif %}";

lexer = Lexer(text, None)
print lexer.tokenize()
parser = Parser(lexer.tokenize())

print parser.parse()


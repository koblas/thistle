#!/usr/bin/python

from django.template import Template, Context
import sys, os

os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

for file in sys.argv[1:] :
    tmpl = Template(open(file).read())
    print tmpl.render(Context({})),

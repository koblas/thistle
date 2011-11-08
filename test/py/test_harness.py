# -*- coding: utf-8 -*-

import thistle

import unittest
from datetime import datetime, timedelta
import time
import os
import sys
import traceback
import warnings
from urlparse import urljoin

#####################################
# Helper objects for template tests #
#####################################

class SomeException(Exception):
    silent_variable_failure = True

class SomeOtherException(Exception):
    pass

class ContextStackException(Exception):
    pass

class SomeClass:
    def __init__(self):
        self.otherclass = OtherClass()

    def method(self):
        return "SomeClass.method"

    def method2(self, o):
        return o

    def method3(self):
        raise SomeException

    def method4(self):
        raise SomeOtherException

    def __getitem__(self, key):
        if key == 'silent_fail_key':
            raise SomeException
        elif key == 'noisy_fail_key':
            raise SomeOtherException
        raise KeyError

    def silent_fail_attribute(self):
        raise SomeException
    silent_fail_attribute = property(silent_fail_attribute)

    def noisy_fail_attribute(self):
        raise SomeOtherException
    noisy_fail_attribute = property(noisy_fail_attribute)

class OtherClass:
    def method(self):
        return "OtherClass.method"

class TestObj(object):
    def is_true(self):
        return True

    def is_false(self):
        return False

    def is_bad(self):
        time.sleep(0.3)
        return True

class SilentGetItemClass(object):
    def __getitem__(self, key):
        raise SomeException

class SilentAttrClass(object):
    def b(self):
        raise SomeException
    b = property(b)

class UTF8Class:
    "Class whose __str__ returns non-ASCII data"
    def __str__(self):
        return u'ŠĐĆŽćžšđ'.encode('utf-8')

class Templates(unittest.TestCase):
    def test_templates(self):
        template_tests = self.get_template_tests()

        thistle.Thistle.TEMPLATE_STRING_IF_INVALID = "INVALID"

        def loader(name, dirs):
            return (thistle.Template(template_tests[name][0], None, name), name)

        thistle.Template.template_loaders.append(loader)

        failures = []

        for name, vals in template_tests.items():
            #if name != 'basic-syntax27': continue

            if not vals : continue
            print("Running: %s" % name)

            
            try:
                found = False

                def func():
                    tmpl = thistle.Template(vals[0])
                    return tmpl.render(thistle.Context(vals[1]))

                result = vals[2]
                output = func()
                if output == result:
                    found = True
                elif isinstance(result, (tuple, list)):
                    if output in vals[2]:
                        found = True

                if not found:
                    failures.append("Template test: %s -- FAILED. Expected %r, got %r" % (name, result, output))
                    print failures[-1]
            except Exception as e:
                if type(vals[2]) == type(object) or vals[2] == "Thistle.TemplateSyntaxError":
                    #if issubclass(thistle.ThistleException, e.__class_):
                    #    pass
                    pass
                else:
                    failures.append("Template test: %s -- FAILED. Expected %r, got %r" % (name, result, e))
                    print failures[-1]
                pass

    def get_template_tests(self):
        import  json, re

        def removeComments(text):
            while text:
                idx = text.find('/*')
                if idx == -1:
                    break
                eidx = text.find('*/', idx)
                if eidx == -1:
                    eidx = len(text)
                text = text[0:idx] + text[eidx+2:]
            while text:
                idx = text.find('//')
                if idx == -1:
                    break
                eidx = text.find("\n", idx)
                if eidx == -1:
                    eidx = len(text)
                text = text[0:idx] + text[eidx+1:]
            #if text.find("END_OF_FILE"):
            #    text = text[0:text.find("END_OF_FILE")] + '"eof":[]}'
            return text

        with open('input/basic_template.json') as fd:
           data = removeComments(fd.read())
           return  json.loads(data)

if __name__ == "__main__":
    unittest.main()

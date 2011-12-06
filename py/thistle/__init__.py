from .context import Context

class ThistleException(Exception):
    """Thistle Exception"""
    pass

class TemplateSyntaxError(ThistleException):
    """Template Syntax Error"""
    pass

class TemplateDoesNotExist(ThistleException):
    """Template Syntax Error"""
    pass

class VariableDoesNotExist(ThistleException):
    """Variable Syntax Error"""
    pass

class Thistle(object):
    FILTER_SEPARATOR = '|';
    FILTER_ARGUMENT_SEPARATOR = ':';
    VARIABLE_ATTRIBUTE_SEPARATOR = '.';
    BLOCK_TAG_START = '{%';
    BLOCK_TAG_END = '%}';
    VARIABLE_TAG_START = '{{';
    VARIABLE_TAG_END = '}}';
    COMMENT_TAG_START = '{#';
    COMMENT_TAG_END = '#}';
    SINGLE_BRACE_START = '{';
    SINGLE_BRACE_END = '}';
    TRANSLATOR_COMMENT_MARK = 'Translators'

    TEMPLATE_STRING_IF_INVALID = '';

    def render(self, view):
        pass

#
#
#
class Template(object):
    def __init__(self, template_string, origin=None, name='UNKNOWN'):
        from .lexer import Lexer
        from .parser import Parser

        lexer  = Lexer(template_string)
        parser = Parser(lexer.tokenize())

        self.name     = name
        self.nodelist = parser.parse()

    def render(self, context):
        context.render_context.push()
        v = None
        try :
            v = self._render(context)
        finally:
            context.render_context.pop()
        return v

    def _render(self, context):
        return self.nodelist.render(context)

    def __str__(self):
        return '<Template %s [%s]>' % (self.name, ', '.join(['%r' % n for n in self.nodelist[0:5]]))

def add_directory_path(dirname):
    template_directories.append(dirname)

def filesystem_loader(name, dirs):
    import os
    tdata = None
    try:
        for dname in template_directories:
            fullpath = os.path.join(dname, name)
            if os.path.exists(fullpath):
                with open(fullpath) as fd:
                    tdata = fd.read()
                    return (tdata, name)
    except Exception as e:
        print e

def render_to_string(name, dictionary={}, context_instance=None):
    from .loader_tags import get_template
    from .context import Context
    
    tmpl = get_template(name)
    if not context_instance:
        context_instance = Context()
    if dictionary:
        context_instance.update(dictionary)
    return tmpl.render(context_instance)

template_directories = []
template_loaders = [filesystem_loader]

#
#
#
class TornadoWrapper(object):
    def __init__(self, tmpl):
        self.tmpl = tmpl

    def generate(self, **kwargs):
        from .context import Context

        context_instance = kwargs.get('context_instance', None)
        if not context_instance:
            context_instance = Context()
        context_instance.update(kwargs)
        return self.tmpl.render(context_instance)
    
class TornadoLoader(object):
    cache = {}

    def load(self, name):
        from .loader_tags import get_template

        if name in self.cache:
            tmpl = self.cache[name]
        else:
            tmpl = get_template(name)
            self.cache[name] = tmpl
        return TornadoWrapper(tmpl)

    def reset(self):
        """Uncache the template"""
        self.cache = {}

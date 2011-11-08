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

class Template(object):
    template_loaders = []

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

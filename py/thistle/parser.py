import re
from inspect import getargspec
from . import Thistle, TemplateSyntaxError, VariableDoesNotExist
from .safestring import mark_safe, unescape_string_literal
from .node import *
from .token import Token
from .safestring import EscapeData, SafeData

def ugettext_lazy(x) : return x

builtins = []

def add_to_builtins(module):
    from .importlib import import_module
    mod = import_module(module)
    if hasattr(mod, 'register') and mod.register:
        builtins.append(mod.register)

add_to_builtins('thistle.default_tags');
#add_to_builtins('thistle.loader_tags');
add_to_builtins('thistle.default_filters');

class Parser(object):
    def __init__(self, tokens):
        self.tokens = tokens
        self.tags = {}
        self.filters = {}

        for lib in builtins:
            self.add_library(lib)

    def parse(self, parse_until=None):
        if parse_until is None: parse_until = []
        nodelist = self.create_nodelist()
        while self.tokens:
            token = self.next_token()
            if token.token_type == Token.TOKEN_TEXT:
                self.extend_nodelist(nodelist, TextNode(token.contents), token)
            elif token.token_type == Token.TOKEN_VAR:
                if not token.contents:
                    self.empty_variable(token)
                filter_expression = self.compile_filter(token.contents)
                var_node = self.create_variable_node(filter_expression)
                self.extend_nodelist(nodelist, var_node,token)
            elif token.token_type == Token.TOKEN_BLOCK:
                if token.contents in parse_until:
                    # put token back on token list so calling code knows why it terminated
                    self.prepend_token(token)
                    return nodelist
                try:
                    command = token.contents.split()[0]
                except IndexError:
                    self.empty_block_tag(token)
                # execute callback function for this tag and append resulting node
                self.enter_command(command, token)
                try:
                    compile_func = self.tags[command]
                except KeyError:
                    self.invalid_block_tag(token, command, parse_until)
                try:
                    compiled_result = compile_func(self, token)
                except TemplateSyntaxError, e:
                    if not self.compile_function_error(token, e):
                        raise
                self.extend_nodelist(nodelist, compiled_result, token)
                self.exit_command()
        if parse_until:
            self.unclosed_block_tag(parse_until)
        return nodelist

    def skip_past(self, endtag):
        while self.tokens:
            token = self.next_token()
            if token.token_type == Token.TOKEN_BLOCK and token.contents == endtag:
                return
        self.unclosed_block_tag([endtag])

    def create_variable_node(self, filter_expression):
        return VariableNode(filter_expression)

    def create_nodelist(self):
        return NodeList()

    def extend_nodelist(self, nodelist, node, token):
        if node.must_be_first and nodelist:
            try:
                if nodelist.contains_nontext:
                    raise AttributeError
            except AttributeError:
                raise TemplateSyntaxError("%r must be the first tag in the template." % node)
        if isinstance(nodelist, NodeList) and not isinstance(node, TextNode):
            nodelist.contains_nontext = True
        nodelist.append(node)

    def enter_command(self, command, token):
        pass

    def exit_command(self):
        pass

    def error(self, token, msg):
        return TemplateSyntaxError(msg)

    def empty_variable(self, token):
        raise self.error(token, "Empty variable tag")

    def empty_block_tag(self, token):
        raise self.error(token, "Empty block tag")

    def invalid_block_tag(self, token, command, parse_until=None):
        if parse_until:
            raise self.error(token, "Invalid block tag: '%s', expected %s" % (command, ' '.join(["'%s'" % p for p in parse_until])))
        raise self.error(token, "Invalid block tag: '%s'" % command)

    def unclosed_block_tag(self, parse_until):
        raise self.error(None, "Unclosed tags: %s " %  ', '.join(parse_until))

    def compile_function_error(self, token, e):
        pass

    def next_token(self):
        return self.tokens.pop(0)

    def prepend_token(self, token):
        self.tokens.insert(0, token)

    def delete_first_token(self):
        del self.tokens[0]

    def add_library(self, lib):
        self.tags.update(lib.tags)
        self.filters.update(lib.filters)

    def compile_filter(self, token):
        "Convenient wrapper for FilterExpression"
        return FilterExpression(token, self)

    def find_filter(self, filter_name):
        if filter_name in self.filters:
            return self.filters[filter_name]
        else:
            raise TemplateSyntaxError("Invalid filter: '%s'" % filter_name)

class TokenParser(object):
    """
    Subclass this and implement the top() method to parse a template line. When
    instantiating the parser, pass in the line from the Django template parser.

    The parser's "tagname" instance-variable stores the name of the tag that
    the filter was called with.
    """
    def __init__(self, subject):
        self.subject = subject
        self.pointer = 0
        self.backout = []
        self.tagname = self.tag()

    def top(self):
        "Overload this method to do the actual parsing and return the result."
        raise NotImplementedError()

    def more(self):
        "Returns True if there is more stuff in the tag."
        return self.pointer < len(self.subject)

    def back(self):
        "Undoes the last microparser. Use this for lookahead and backtracking."
        if not len(self.backout):
            raise TemplateSyntaxError("back called without some previous parsing")
        self.pointer = self.backout.pop()

    def tag(self):
        "A microparser that just returns the next tag from the line."
        subject = self.subject
        i = self.pointer
        if i >= len(subject):
            raise TemplateSyntaxError("expected another tag, found end of string: %s" % subject)
        p = i
        while i < len(subject) and subject[i] not in (' ', '\t'):
            i += 1
        s = subject[p:i]
        while i < len(subject) and subject[i] in (' ', '\t'):
            i += 1
        self.backout.append(self.pointer)
        self.pointer = i
        return s

    def value(self):
        "A microparser that parses for a value: some string constant or variable name."
        subject = self.subject
        i = self.pointer

        def next_space_index(subject, i):
            "Increment pointer until a real space (i.e. a space not within quotes) is encountered"
            while i < len(subject) and subject[i] not in (' ', '\t'):
                if subject[i] in ('"', "'"):
                    c = subject[i]
                    i += 1
                    while i < len(subject) and subject[i] != c:
                        i += 1
                    if i >= len(subject):
                        raise TemplateSyntaxError("Searching for value. Unexpected end of string in column %d: %s" % (i, subject))
                i += 1
            return i

        if i >= len(subject):
            raise TemplateSyntaxError("Searching for value. Expected another value but found end of string: %s" % subject)
        if subject[i] in ('"', "'"):
            p = i
            i += 1
            while i < len(subject) and subject[i] != subject[p]:
                i += 1
            if i >= len(subject):
                raise TemplateSyntaxError("Searching for value. Unexpected end of string in column %d: %s" % (i, subject))
            i += 1

            # Continue parsing until next "real" space, so that filters are also included
            i = next_space_index(subject, i)

            res = subject[p:i]
            while i < len(subject) and subject[i] in (' ', '\t'):
                i += 1
            self.backout.append(self.pointer)
            self.pointer = i
            return res
        else:
            p = i
            i = next_space_index(subject, i)
            s = subject[p:i]
            while i < len(subject) and subject[i] in (' ', '\t'):
                i += 1
            self.backout.append(self.pointer)
            self.pointer = i
            return s


# This only matches constant *strings* (things in quotes or marked for
# translation). Numbers are treated as variables for implementation reasons
# (so that they retain their type when passed to filters).
constant_string = r"""
(?:%(i18n_open)s%(strdq)s%(i18n_close)s|
%(i18n_open)s%(strsq)s%(i18n_close)s|
%(strdq)s|
%(strsq)s)
""" % {
    'strdq': r'"[^"\\]*(?:\\.[^"\\]*)*"', # double-quoted string
    'strsq': r"'[^'\\]*(?:\\.[^'\\]*)*'", # single-quoted string
    'i18n_open' : re.escape("_("),
    'i18n_close' : re.escape(")"),
    }
constant_string = constant_string.replace("\n", "")

filter_raw_string = r"""
^(?P<constant>%(constant)s)|
^(?P<var>[%(var_chars)s]+|%(num)s)|
 (?:%(filter_sep)s
     (?P<filter_name>\w+)
         (?:%(arg_sep)s
             (?:
              (?P<constant_arg>%(constant)s)|
              (?P<var_arg>[%(var_chars)s]+|%(num)s)
             )
         )?
 )""" % {
    'constant': constant_string,
    'num': r'[-+\.]?\d[\d\.e]*',
    'var_chars': "\w\." ,
    'filter_sep': re.escape(Thistle.FILTER_SEPARATOR),
    'arg_sep': re.escape(Thistle.FILTER_ARGUMENT_SEPARATOR),
  }

filter_re = re.compile(filter_raw_string, re.UNICODE|re.VERBOSE)

class FilterExpression(object):
    r"""
    Parses a variable token and its optional filters (all as a single string),
    and return a list of tuples of the filter name and arguments.
    Sample:
        >>> token = 'variable|default:"Default value"|date:"Y-m-d"'
        >>> p = Parser('')
        >>> fe = FilterExpression(token, p)
        >>> len(fe.filters)
        2
        >>> fe.var
        <Variable: 'variable'>

    This class should never be instantiated outside of the
    get_filters_from_token helper function.
    """
    def __init__(self, token, parser):
        self.token = token
        matches = filter_re.finditer(token)
        var_obj = None
        filters = []
        upto = 0
        for match in matches:
            start = match.start()
            if upto != start:
                raise TemplateSyntaxError("Could not parse some characters: %s|%s|%s"  % \
                        (token[:upto], token[upto:start], token[start:]))
            if var_obj is None:
                var, constant = match.group("var", "constant")
                if constant:
                    try:
                        var_obj = Variable(constant).resolve({})
                    except VariableDoesNotExist:
                        var_obj = None
                elif var is None:
                    raise TemplateSyntaxError("Could not find variable at start of %s." % token)
                else:
                    var_obj = Variable(var)
            else:
                filter_name = match.group("filter_name")
                args = []
                constant_arg, var_arg = match.group("constant_arg", "var_arg")
                if constant_arg:
                    args.append((False, Variable(constant_arg).resolve({})))
                elif var_arg:
                    args.append((True, Variable(var_arg)))
                filter_func = parser.find_filter(filter_name)
                self.args_check(filter_name, filter_func, args)
                filters.append((filter_func, args))
            upto = match.end()
        if upto != len(token):
            raise TemplateSyntaxError("Could not parse the remainder: '%s' from '%s'" % (token[upto:], token))

        self.filters = filters
        self.var = var_obj

    def resolve(self, context, ignore_failures=False):
        if isinstance(self.var, Variable):
            try:
                obj = self.var.resolve(context)
            except VariableDoesNotExist:
                if ignore_failures:
                    obj = None
                else:
                    if Thistle.TEMPLATE_STRING_IF_INVALID:
                        global invalid_var_format_string
                        if invalid_var_format_string is None:
                            invalid_var_format_string = '%s' in Thistle.TEMPLATE_STRING_IF_INVALID
                        if invalid_var_format_string:
                            return Thistle.TEMPLATE_STRING_IF_INVALID % self.var
                        return Thistle.TEMPLATE_STRING_IF_INVALID
                    else:
                        obj = Thistle.TEMPLATE_STRING_IF_INVALID
        else:
            obj = self.var
        for func, args in self.filters:
            arg_vals = []
            for lookup, arg in args:
                if not lookup:
                    arg_vals.append(mark_safe(arg))
                else:
                    arg_vals.append(arg.resolve(context))
            if getattr(func, 'needs_autoescape', False):
                new_obj = func(obj, autoescape=context.autoescape, *arg_vals)
            else:
                new_obj = func(obj, *arg_vals)
            if getattr(func, 'is_safe', False) and isinstance(obj, SafeData):
                obj = mark_safe(new_obj)
            elif isinstance(obj, EscapeData):
                obj = mark_for_escaping(new_obj)
            else:
                obj = new_obj
        return obj

    def args_check(name, func, provided):
        provided = list(provided)
        plen = len(provided)
        # Check to see if a decorator is providing the real function.
        func = getattr(func, '_decorated_function', func)
        args, varargs, varkw, defaults = getargspec(func)
        # First argument is filter input.
        args.pop(0)
        if defaults:
            nondefs = args[:-len(defaults)]
        else:
            nondefs = args
        # Args without defaults must be provided.
        try:
            for arg in nondefs:
                provided.pop(0)
        except IndexError:
            # Not enough
            raise TemplateSyntaxError("%s requires %d arguments, %d provided" % (name, len(nondefs), plen))

        # Defaults can be overridden.
        defaults = defaults and list(defaults) or []
        try:
            for parg in provided:
                defaults.pop(0)
        except IndexError:
            # Too many.
            raise TemplateSyntaxError("%s requires %d arguments, %d provided" % (name, len(nondefs), plen))

        return True
    args_check = staticmethod(args_check)

    def __str__(self):
        return self.token

def resolve_variable(path, context):
    """
    Returns the resolved variable, which may contain attribute syntax, within
    the given context.

    Deprecated; use the Variable class instead.
    """
    return Variable(path).resolve(context)

class Variable(object):
    r"""
    A template variable, resolvable against a given context. The variable may be
    a hard-coded string (if it begins and ends with single or double quote
    marks)::

        >>> c = {'article': {'section':u'News'}}
        >>> Variable('article.section').resolve(c)
        u'News'
        >>> Variable('article').resolve(c)
        {'section': u'News'}
        >>> class AClass: pass
        >>> c = AClass()
        >>> c.article = AClass()
        >>> c.article.section = u'News'

    (The example assumes VARIABLE_ATTRIBUTE_SEPARATOR is '.')
    """

    def __init__(self, var):
        self.var = var
        self.literal = None
        self.lookups = None
        self.translate = False

        try:
            # First try to treat this variable as a number.
            #
            # Note that this could cause an OverflowError here that we're not
            # catching. Since this should only happen at compile time, that's
            # probably OK.
            self.literal = float(var)

            # So it's a float... is it an int? If the original value contained a
            # dot or an "e" then it was a float, not an int.
            if '.' not in var and 'e' not in var.lower():
                self.literal = int(self.literal)

            # "2." is invalid
            if var.endswith('.'):
                raise ValueError

        except ValueError:
            # A ValueError means that the variable isn't a number.
            if var.startswith('_(') and var.endswith(')'):
                # The result of the lookup should be translated at rendering
                # time.
                self.translate = True
                var = var[2:-1]
            # If it's wrapped with quotes (single or double), then
            # we're also dealing with a literal.
            try:
                self.literal = mark_safe(unescape_string_literal(var))
            except ValueError:
                # Otherwise we'll set self.lookups so that resolve() knows we're
                # dealing with a bonafide variable
                if var.find(Thistle.VARIABLE_ATTRIBUTE_SEPARATOR + '_') > -1 or var[0] == '_':
                    raise TemplateSyntaxError("Variables and attributes may not begin with underscores: '%s'" % var)
                self.lookups = tuple(var.split(Thistle.VARIABLE_ATTRIBUTE_SEPARATOR))

    def resolve(self, context):
        """Resolve this variable against a given context."""
        if self.lookups is not None:
            # We're dealing with a variable that needs to be resolved
            value = self._resolve_lookup(context)
        else:
            # We're dealing with a literal, so it's already been "resolved"
            value = self.literal
        if self.translate:
            return ugettext_lazy(value)
        return value

    def __repr__(self):
        return "<%s: %r>" % (self.__class__.__name__, self.var)

    def __str__(self):
        return self.var

    def _resolve_lookup(self, context):
        """
        Performs resolution of a real variable (i.e. not a literal) against the
        given context.

        As indicated by the method's name, this method is an implementation
        detail and shouldn't be called by external code. Use Variable.resolve()
        instead.
        """
        current = context
        try: # catch-all for silent variable failures
            for bit in self.lookups:
                try: # dictionary lookup
                    current = current[bit]
                except (TypeError, AttributeError, KeyError):
                    try: # attribute lookup
                        current = getattr(current, bit)
                    except (TypeError, AttributeError):
                        try: # list-index lookup
                            current = current[int(bit)]
                        except (IndexError, # list index out of range
                                ValueError, # invalid literal for int()
                                KeyError,   # current is a dict without `int(bit)` key
                                TypeError,  # unsubscriptable object
                                ):
                            raise VariableDoesNotExist("Failed lookup for key [%s] in %r", (bit, current)) # missing attribute
                if callable(current):
                    if getattr(current, 'alters_data', False):
                        current = Thistle.TEMPLATE_STRING_IF_INVALID
                    else:
                        try: # method call (assuming no args required)
                            current = current()
                        except TypeError: # arguments *were* required
                            # GOTCHA: This will also catch any TypeError
                            # raised in the function itself.
                            current = Thistle.TEMPLATE_STRING_IF_INVALID # invalid method call
        except Exception, e:
            if getattr(e, 'silent_variable_failure', False):
                current = Thistle.TEMPLATE_STRING_IF_INVALID
            else:
                raise

        return current

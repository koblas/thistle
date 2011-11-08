from inspect import getargspec
from .context import Context

class InvalidTemplateLibrary(Exception):
    pass

class Library(object):
    def __init__(self):
        self.filters = {}
        self.tags = {}

    def tag(self, name=None, compile_function=None):
        if name == None and compile_function == None:
            # @register.tag()
            return self.tag_function
        elif name != None and compile_function == None:
            if callable(name):
                # @register.tag
                return self.tag_function(name)
            else:
                # @register.tag('somename') or @register.tag(name='somename')
                def dec(func):
                    return self.tag(name, func)
                return dec
        elif name != None and compile_function != None:
            # register.tag('somename', somefunc)
            self.tags[name] = compile_function
            return compile_function
        else:
            raise InvalidTemplateLibrary("Unsupported arguments to Library.tag: (%r, %r)", (name, compile_function))

    def tag_function(self,func):
        self.tags[getattr(func, "_decorated_function", func).__name__] = func
        return func

    def filter(self, name=None, filter_func=None):
        if name == None and filter_func == None:
            # @register.filter()
            return self.filter_function
        elif filter_func == None:
            if callable(name):
                # @register.filter
                return self.filter_function(name)
            else:
                # @register.filter('somename') or @register.filter(name='somename')
                def dec(func):
                    return self.filter(name, func)
                return dec
        elif name != None and filter_func != None:
            # register.filter('somename', somefunc)
            self.filters[name] = filter_func
            return filter_func
        else:
            raise InvalidTemplateLibrary("Unsupported arguments to Library.filter: (%r, %r)", (name, filter_func))

    def filter_function(self, func):
        self.filters[getattr(func, "_decorated_function", func).__name__] = func
        return func

    def simple_tag(self, func=None, takes_context=None, name=None):
        def dec(func):
            params, xx, xxx, defaults = getargspec(func)
            if takes_context:
                if params[0] == 'context':
                    params = params[1:]
                else:
                    raise TemplateSyntaxError("Any tag function decorated with takes_context=True must have a first argument of 'context'")

            class SimpleNode(Node):
                def __init__(self, vars_to_resolve):
                    self.vars_to_resolve = map(Variable, vars_to_resolve)

                def render(self, context):
                    resolved_vars = [var.resolve(context) for var in self.vars_to_resolve]
                    if takes_context:
                        func_args = [context] + resolved_vars
                    else:
                        func_args = resolved_vars
                    return func(*func_args)

            function_name = name or getattr(func, '_decorated_function', func).__name__
            compile_func = partial(generic_tag_compiler, params, defaults, function_name, SimpleNode)
            compile_func.__doc__ = func.__doc__
            self.tag(function_name, compile_func)
            return func

        if func is None:
            # @register.simple_tag(...)
            return dec
        elif callable(func):
            # @register.simple_tag
            return dec(func)
        else:
            raise TemplateSyntaxError("Invalid arguments provided to simple_tag")

    def assignment_tag(self, func=None, takes_context=None, name=None):
        def dec(func):
            params, xx, xxx, defaults = getargspec(func)
            if takes_context:
                if params[0] == 'context':
                    params = params[1:]
                else:
                    raise TemplateSyntaxError("Any tag function decorated with takes_context=True must have a first argument of 'context'")

            class AssignmentNode(Node):
                def __init__(self, params_vars, target_var):
                    self.params_vars = map(Variable, params_vars)
                    self.target_var = target_var

                def render(self, context):
                    resolved_vars = [var.resolve(context) for var in self.params_vars]
                    if takes_context:
                        func_args = [context] + resolved_vars
                    else:
                        func_args = resolved_vars
                    context[self.target_var] = func(*func_args)
                    return ''

            def compile_func(parser, token):
                bits = token.split_contents()
                tag_name = bits[0]
                bits = bits[1:]
                params_max = len(params)
                defaults_length = defaults and len(defaults) or 0
                params_min = params_max - defaults_length
                if (len(bits) < 2 or bits[-2] != 'as'):
                    raise TemplateSyntaxError(
                        "'%s' tag takes at least 2 arguments and the "
                        "second last argument must be 'as'" % tag_name)
                params_vars = bits[:-2]
                target_var = bits[-1]
                if (len(params_vars) < params_min or
                        len(params_vars) > params_max):
                    if params_min == params_max:
                        raise TemplateSyntaxError(
                            "%s takes %s arguments" % (tag_name, params_min))
                    else:
                        raise TemplateSyntaxError(
                            "%s takes between %s and %s arguments"
                            % (tag_name, params_min, params_max))
                return AssignmentNode(params_vars, target_var)

            function_name = name or getattr(func, '_decorated_function', func).__name__
            compile_func.__doc__ = func.__doc__
            self.tag(function_name, compile_func)
            return func

        if func is None:
            # @register.assignment_tag(...)
            return dec
        elif callable(func):
            # @register.assignment_tag
            return dec(func)
        else:
            raise TemplateSyntaxError("Invalid arguments provided to assignment_tag")

    def inclusion_tag(self, file_name, context_class=Context, takes_context=False, name=None):
        def dec(func):
            params, xx, xxx, defaults = getargspec(func)
            if takes_context:
                if params[0] == 'context':
                    params = params[1:]
                else:
                    raise TemplateSyntaxError("Any tag function decorated with takes_context=True must have a first argument of 'context'")

            class InclusionNode(Node):
                def __init__(self, vars_to_resolve):
                    self.vars_to_resolve = map(Variable, vars_to_resolve)

                def render(self, context):
                    resolved_vars = [var.resolve(context) for var in self.vars_to_resolve]
                    if takes_context:
                        args = [context] + resolved_vars
                    else:
                        args = resolved_vars

                    dict = func(*args)

                    if not getattr(self, 'nodelist', False):
                        from django.template.loader import get_template, select_template
                        if isinstance(file_name, Template):
                            t = file_name
                        elif not isinstance(file_name, basestring) and is_iterable(file_name):
                            t = select_template(file_name)
                        else:
                            t = get_template(file_name)
                        self.nodelist = t.nodelist
                    new_context = context_class(dict, **{
                        'autoescape': context.autoescape,
                        'current_app': context.current_app,
                        'use_l10n': context.use_l10n,
                    })
                    # Copy across the CSRF token, if present, because inclusion
                    # tags are often used for forms, and we need instructions
                    # for using CSRF protection to be as simple as possible.
                    csrf_token = context.get('csrf_token', None)
                    if csrf_token is not None:
                        new_context['csrf_token'] = csrf_token
                    return self.nodelist.render(new_context)

            function_name = name or getattr(func, '_decorated_function', func).__name__
            compile_func = partial(generic_tag_compiler, params, defaults, function_name, InclusionNode)
            compile_func.__doc__ = func.__doc__
            self.tag(function_name, compile_func)
            return func
        return dec

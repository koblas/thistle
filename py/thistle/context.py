from copy import copy

class ContextPopException(Exception):
    "pop() has been called more times than push()"
    pass

class EmptyClass(object):
    # No-op class which takes no args to its __init__ method, to help implement
    # __copy__
    pass

class BaseContext(object):
    def __init__(self, dict_=None):
        dict_ = dict_ or {}
        self.dicts = [dict_]

    def __copy__(self):
        duplicate = EmptyClass()
        duplicate.__class__ = self.__class__
        duplicate.__dict__ = self.__dict__.copy()
        duplicate.dicts = duplicate.dicts[:]
        return duplicate

    def __repr__(self):
        return repr(self.dicts)

    def __iter__(self):
        for d in reversed(self.dicts):
            yield d

    def push(self):
        d = {}
        self.dicts.append(d)
        return d

    def pop(self):
        if len(self.dicts) == 1:
            raise ContextPopException
        return self.dicts.pop()

    def __setitem__(self, key, value):
        "Set a variable in the current context"
        self.dicts[-1][key] = value

    def __getitem__(self, key):
        "Get a variable's value, starting at the current context and going upward"
        for d in reversed(self.dicts):
            if key in d:
                return d[key]
        raise KeyError(key)

    def __delitem__(self, key):
        "Delete a variable from the current context"
        del self.dicts[-1][key]

    def has_key(self, key):
        for d in self.dicts:
            if key in d:
                return True
        return False

    def __contains__(self, key):
        return self.has_key(key)

    def get(self, key, otherwise=None):
        for d in reversed(self.dicts):
            if key in d:
                return d[key]
        return otherwise

class Context(BaseContext):
    "A stack container for variable context"
    def __init__(self, dict_=None, autoescape=True, current_app=None, use_l10n=None):
        self.autoescape = autoescape
        self.use_l10n = use_l10n
        self.current_app = current_app
        self.render_context = RenderContext()
        super(Context, self).__init__(dict_)

    def __copy__(self):
        duplicate = super(Context, self).__copy__()
        duplicate.render_context = copy(self.render_context)
        return duplicate

    def update(self, other_dict):
        "Pushes other_dict to the stack of dictionaries in the Context"
        if not hasattr(other_dict, '__getitem__'):
            raise TypeError('other_dict must be a mapping (dictionary-like) object.')
        self.dicts.append(other_dict)
        return other_dict

    def new(self, values=None):
        """
        Returns a new Context with the same 'autoescape' value etc, but with
        only the values given in 'values' stored.
        """
        return self.__class__(dict_=values, autoescape=self.autoescape,
                              current_app=self.current_app, use_l10n=self.use_l10n)

class RenderContext(BaseContext):
    """
    A stack container for storing Template state.

    RenderContext simplifies the implementation of template Nodes by providing a
    safe place to store state between invocations of a node's `render` method.

    The RenderContext also provides scoping rules that are more sensible for
    'template local' variables. The render context stack is pushed before each
    template is rendered, creating a fresh scope with nothing in it. Name
    resolution fails if a variable is not found at the top of the RequestContext
    stack. Thus, variables are local to a specific template and don't affect the
    rendering of other templates as they would if they were stored in the normal
    template context.
    """
    def __iter__(self):
        for d in self.dicts[-1]:
            yield d

    def has_key(self, key):
        return key in self.dicts[-1]

    def get(self, key, otherwise=None):
        d = self.dicts[-1]
        if key in d:
            return d[key]
        return otherwise
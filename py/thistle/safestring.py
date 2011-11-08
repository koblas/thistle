"""
Functions for working with "safe strings": strings that can be displayed safely
without further escaping in HTML. Marking something as a "safe string" means
that the producer of the string has already turned characters that should not
be interpreted by the HTML engine (e.g. '<') into the appropriate entities.
"""
def curry(_curried_func, *args, **kwargs):
    def _curried(*moreargs, **morekwargs):
        return _curried_func(*(args+moreargs), **dict(kwargs, **morekwargs))
    return _curried

class EscapeData(object):
    pass

class EscapeString(str, EscapeData):
    """
    A string that should be HTML-escaped when output.
    """
    pass

class EscapeUnicode(unicode, EscapeData):
    """
    A unicode object that should be HTML-escaped when output.
    """
    pass

class SafeData(object):
    pass

class SafeString(str, SafeData):
    """
    A string subclass that has been specifically marked as "safe" (requires no
    further escaping) for HTML output purposes.
    """
    def __add__(self, rhs):
        """
        Concatenating a safe string with another safe string or safe unicode
        object is safe. Otherwise, the result is no longer safe.
        """
        t = super(SafeString, self).__add__(rhs)
        if isinstance(rhs, SafeUnicode):
            return SafeUnicode(t)
        elif isinstance(rhs, SafeString):
            return SafeString(t)
        return t
        
    def _proxy_method(self, *args, **kwargs):
        """
        Wrap a call to a normal unicode method up so that we return safe
        results. The method that is being wrapped is passed in the 'method'
        argument.
        """
        method = kwargs.pop('method')
        data = method(self, *args, **kwargs)
        if isinstance(data, str):
            return SafeString(data)
        else:
            return SafeUnicode(data)

    decode = curry(_proxy_method, method = str.decode)

class SafeUnicode(unicode, SafeData):
    """
    A unicode subclass that has been specifically marked as "safe" for HTML
    output purposes.
    """
    def __add__(self, rhs):
        """
        Concatenating a safe unicode object with another safe string or safe
        unicode object is safe. Otherwise, the result is no longer safe.
        """
        t = super(SafeUnicode, self).__add__(rhs)
        if isinstance(rhs, SafeData):
            return SafeUnicode(t)
        return t
    
    def _proxy_method(self, *args, **kwargs):
        """
        Wrap a call to a normal unicode method up so that we return safe
        results. The method that is being wrapped is passed in the 'method'
        argument.
        """
        method = kwargs.pop('method')
        data = method(self, *args, **kwargs)
        if isinstance(data, str):
            return SafeString(data)
        else:
            return SafeUnicode(data)

    encode = curry(_proxy_method, method = unicode.encode)

def mark_safe(s):
    """
    Explicitly mark a string as safe for (HTML) output purposes. The returned
    object can be used everywhere a string or unicode object is appropriate.

    Can be called multiple times on a single string.
    """
    if isinstance(s, SafeData):
        return s
    if isinstance(s, str):
        return SafeString(s)
    if isinstance(s, unicode):
        return SafeUnicode(s)
    return SafeString(str(s))

def mark_for_escaping(s):
    """
    Explicitly mark a string as requiring HTML escaping upon output. Has no
    effect on SafeData subclasses.

    Can be called multiple times on a single string (the resulting escaping is
    only applied once).
    """
    if isinstance(s, (SafeData, EscapeData)):
        return s
    if isinstance(s, str):
        return EscapeString(s)
    if isinstance(s, unicode):
        return EscapeUnicode(s)
    return EscapeString(str(s))


#
#  From django.utils.html
#
def force_unicode(s):
    if isinstance(s, unicode):
        return s
    try:
        if not isinstance(s, basestring,):
            if hasattr(s, '__unicode__'):
                s = unicode(s)
            else:
                s = unicode(str(s), 'utf-8', 'strict')
        elif not isinstance(s, unicode):
            s = s.decode(encoding, errors)
    except:
        pass
    return s

def conditional_escape(html):
    """
    Similar to escape(), except that it doesn't operate on pre-escaped strings.
    """
    if isinstance(html, SafeData):
        return html
    return escape(html)

def escape(html):
    """
    Returns the given HTML with ampersands, quotes and angle brackets encoded.
    """
    return mark_safe(force_unicode(html).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;'))

def unescape_string_literal(s):
    r"""
    Convert quoted string literals to unquoted strings with escaped quotes and
    backslashes unquoted::

        >>> unescape_string_literal('"abc"')
        'abc'
        >>> unescape_string_literal("'abc'")
        'abc'
        >>> unescape_string_literal('"a \"bc\""')
        'a "bc"'
        >>> unescape_string_literal("'\'ab\' c'")
        "'ab' c"
    """
    if s[0] not in "\"'" or s[-1] != s[0]:
        raise ValueError("Not a string literal: %r" % s)
    quote = s[0]
    return s[1:-1].replace(r'\%s' % quote, quote).replace(r'\\', '\\')

import re
from .safestring import force_unicode

smart_split_re = re.compile(r"""
    ((?:
        [^\s'"]*
        (?:
            (?:"(?:[^"\\]|\\.)*" | '(?:[^'\\]|\\.)*')
            [^\s'"]*
        )+
    ) | \S+)
""", re.VERBOSE)

def smart_split(text):
    r"""
    Generator that splits a string by spaces, leaving quoted phrases together.
    Supports both single and double quotes, and supports escaping quotes with
    backslashes. In the output, strings will keep their initial and trailing
    quote marks and escaped quotes will remain escaped (the results can then
    be further processed with unescape_string_literal()).

    >>> list(smart_split(r'This is "a person\'s" test.'))
    [u'This', u'is', u'"a person\\\'s"', u'test.']
    >>> list(smart_split(r"Another 'person\'s' test."))
    [u'Another', u"'person\\'s'", u'test.']
    >>> list(smart_split(r'A "\"funky\" style" test.'))
    [u'A', u'"\\"funky\\" style"', u'test.']
    """
    text = force_unicode(text)
    for bit in smart_split_re.finditer(text):
        yield bit.group(0)

kwarg_re = re.compile(r"(?:(\w+)=)?(.+)")

def token_kwargs(bits, parser, support_legacy=False):
    """
    A utility method for parsing token keyword arguments.

    :param bits: A list containing remainder of the token (split by spaces)
        that is to be checked for arguments. Valid arguments will be removed
        from this list.

    :param support_legacy: If set to true ``True``, the legacy format
        ``1 as foo`` will be accepted. Otherwise, only the standard ``foo=1``
        format is allowed.

    :returns: A dictionary of the arguments retrieved from the ``bits`` token
        list.

    There is no requirement for all remaining token ``bits`` to be keyword
    arguments, so the dictionary will be returned as soon as an invalid
    argument format is reached.
    """
    if not bits:
        return {}
    match = kwarg_re.match(bits[0])
    kwarg_format = match and match.group(1)
    if not kwarg_format:
        if not support_legacy:
            return {}
        if len(bits) < 3 or bits[1] != 'as':
            return {}

    kwargs = {}
    while bits:
        if kwarg_format:
            match = kwarg_re.match(bits[0])
            if not match or not match.group(1):
                return kwargs
            key, value = match.groups()
            del bits[:1]
        else:
            if len(bits) < 3 or bits[1] != 'as':
                return kwargs
            key, value = bits[2], bits[0]
            del bits[:3]
        kwargs[key] = parser.compile_filter(value)
        if bits and not kwarg_format:
            if bits[0] != 'and':
                return kwargs
            del bits[:1]
    return kwargs

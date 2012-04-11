"""Default variable filters."""

import re
from functools import wraps

from .library import Library
from .safestring import SafeData, force_unicode, conditional_escape, mark_safe

register = Library()

#######################
# STRING DECORATOR    #
#######################

def stringfilter(func):
    """
    Decorator for filters which should only receive unicode objects. The object
    passed as the first positional argument will be converted to a unicode
    object.
    """
    def _dec(*args, **kwargs):
        if args:
            args = list(args)
            args[0] = force_unicode(args[0])
            if isinstance(args[0], SafeData) and getattr(func, 'is_safe', False):
                return mark_safe(func(*args, **kwargs))
        return func(*args, **kwargs)

    # Include a reference to the real function (used to check original
    # arguments by the template parser).
    _dec._decorated_function = getattr(func, '_decorated_function', func)
    for attr in ('is_safe', 'needs_autoescape'):
        if hasattr(func, attr):
            setattr(_dec, attr, getattr(func, attr))
    return wraps(func)(_dec)

#
#
#
def lower(value):
    """Converts a string into all lowercase."""
    return value.lower()
lower.is_safe = True
lower = stringfilter(lower)

def truncatewords(value, arg):
    """
    Truncates a string after a certain number of words.

    Argument: Number of words to truncate after.

    Newlines within the string are removed.
    """
    try:
        length = int(arg)
    except ValueError: # Invalid literal for int().
        return value # Fail silently.

    endtext = "..."

    words = value.split(' ')
    if len(words) > length:
        words = words[0:arg]
        if words[-1] != endtext:
            words.append(endtext)
    return ' '.join(words)

truncatewords.is_safe = True
truncatewords = stringfilter(truncatewords)

def upper(value):
    """Converts a string into all uppercase."""
    return value.upper()
upper.is_safe = False
upper = stringfilter(upper)

def cut(value, arg):
    """
    Removes all values of arg from the given string.
    """
    safe = isinstance(value, SafeData)
    value = value.replace(arg, u'')
    if safe and arg != ';':
        return mark_safe(value)
    return value
cut = stringfilter(cut)

def join(value, arg, autoescape=None):
    """
    Joins a list with a string, like Python's ``str.join(list)``.
    """
    value = map(force_unicode, value)
    if autoescape:
        value = [conditional_escape(v) for v in value]
    try:
        data = conditional_escape(arg).join(value)
    except AttributeError: # fail silently but nicely
        return value
    return mark_safe(data)
join.is_safe = True
join.needs_autoescape = True

def length(value):
    """Returns the length of the value - useful for lists."""
    try:
        return len(value)
    except (ValueError, TypeError):
        return ''
length.is_safe = True

def safe(value):
    """
    Marks the value as a string that should not be auto-escaped.
    """
    return mark_safe(value)
safe.is_safe = True

###################
# LOGIC           #
###################

def default(value, arg):
    """If value is unavailable, use given default."""
    return value or arg
default.is_safe = False

def default_if_none(value, arg):
    """If value is None, use given default."""
    if value is None:
        return arg
    return value
default_if_none.is_safe = False

def yesno(value, arg=None):
    """
    Given a string mapping values for true, false and (optionally) None,
    returns one of those strings accoding to the value:

    ==========  ======================  ==================================
    Value       Argument                Outputs
    ==========  ======================  ==================================
    ``True``    ``"yeah,no,maybe"``     ``yeah``
    ``False``   ``"yeah,no,maybe"``     ``no``
    ``None``    ``"yeah,no,maybe"``     ``maybe``
    ``None``    ``"yeah,no"``           ``"no"`` (converts None to False
                                        if no mapping for None is given.
    ==========  ======================  ==================================
    """
    if arg is None:
        arg = 'yes,no,maybe'
    bits = arg.split(u',')
    if len(bits) < 2:
        return value # Invalid arg.
    try:
        yes, no, maybe = bits
    except ValueError:
        # Unpack list of wrong size (no "maybe" value provided).
        yes, no, maybe = bits[0], bits[1], bits[1]
    if value is None:
        return maybe
    if value:
        return yes
    return no
yesno.is_safe = False

def slice_(value, arg):
    """
    Returns a slice of the list.

    Uses the same syntax as Python's list slicing; see
    http://diveintopython.org/native_data_types/lists.html#odbchelper.list.slice
    for an introduction.
    """
    try:
        bits = []
        for x in arg.split(u':'):
            if len(x) == 0:
                bits.append(None)
            else:
                bits.append(int(x))
        return value[slice(*bits)]

    except (ValueError, TypeError):
        return value # Fail silently.
slice_.is_safe = True

def timesince(value, arg=None):
    """Formats a date as the time since that date (i.e. "4 days, 6 hours")."""
    from django.utils.timesince import timesince
    if not value:
        return u''
    try:
        if arg:
            return timesince(value, arg)
        return timesince(value)
    except (ValueError, TypeError):
        return u''
timesince.is_safe = False

def strftime(value, arg=None):
    try:
        return value.strftime(arg)
    except :
        return u''

#
register.filter(default)
register.filter(yesno)
register.filter(cut)
register.filter(join)
register.filter(lower)
register.filter(upper)
register.filter(default_if_none)
register.filter(length)
register.filter(safe)
register.filter(truncatewords)
register.filter('slice', slice_)
register.filter(timesince)
register.filter(strftime)

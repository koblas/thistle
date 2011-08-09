// Based on:
//    https://code.djangoproject.com/browser/django/trunk/tests/regressiontests/templates/tests.py
//
var sys = require('util'), fs = require('fs');

var Thistle = require('../../nodejs/thistle');

// Test classes
function SomeException() {
    Error.apply(this, arguments);
}
SomeException.prototype = new Error();
SomeException.prototype.constructor = SomeException;
SomeException.prototype.name = "SomeException";

function SomeOtherException() {
    Error.apply(this, arguments);
}
SomeOtherException.prototype = new Error();
SomeOtherException.prototype.constructor = SomeOtherException;
SomeOtherException.prototype.name = "SomeOtherException";

//
//
//
function SomeClass() {
    this.otherclass = new OtherClass();
};

SomeClass.prototype = {
    method: function () {
        return "SomeClass.method";
    },

    method2 : function(o) {
        return o;
    },

    method3 : function() {
        throw new SomeException();
    },

    method4 : function() {
        throw new SomeOtherException();
    }
};

function SilentGetItemClass() {
};

SilentGetItemClass.prototype = {
};

function SilentAttrClass() {
};

SilentAttrClass.prototype = {
};

function OtherClass() {
}

OtherClass.prototype = {
    method : function() {
        return "OtherClass.method";
    }
}


//
//
//
exports.testBasic = function(test) {
    var tests = {
        'basic-syntax01': ["something cool", {}, "something cool"],
        'basic-syntax02': ["{{ headline }}", {'headline':'Success'}, "Success"],

        // SYNTAX --
        // 'template_name': ('template contents', 'context dict', 'expected string output' or Exception class)
        // BASIC SYNTAX ################################################

        // Plain text should go through the template parser untouched
        'basic-syntax01': ["something cool", {}, "something cool"],

        // Variables should be replaced with their value in the current context
        'basic-syntax02': ["{{ headline }}", {'headline':'Success'}, "Success"],

        // More than one replacement variable is allowed in a template
        'basic-syntax03': ["{{ first }} --- {{ second }}", {"first" : 1, "second" : 2}, "1 --- 2"],

        // Fail silently when a variable is not found in the current context
        'basic-syntax04': ["as{{ missing }}df", {}, ("asdf","asINVALIDdf")],

        // A variable may not contain more than one word
        'basic-syntax06': ["{{ multi word variable }}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError for empty variable tags
        'basic-syntax07': ["{{ }}",        {}, Thistle.TemplateSyntaxError],
        'basic-syntax08': ["{{        }}", {}, Thistle.TemplateSyntaxError],

        // Attribute syntax allows a template to call an object's attribute
        'basic-syntax09': ["{{ var.method }}", {"var": new SomeClass()}, "SomeClass.method"],

        // Multiple levels of attribute access are allowed
        'basic-syntax10': ["{{ var.otherclass.method }}", {"var": new SomeClass()}, "OtherClass.method"],

        // Fail silently when a variable's attribute isn't found
        'basic-syntax11': ["{{ var.blech }}", {"var": new SomeClass()}, ("","INVALID")],

        // Raise TemplateSyntaxError when trying to access a variable beginning with an underscore
        'basic-syntax12': ["{{ var.__dict__ }}", {"var": new SomeClass()}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError when trying to access a variable containing an illegal character
        'basic-syntax13': ["{{ va>r }}", {}, Thistle.TemplateSyntaxError],
        'basic-syntax14': ["{{ (var.r) }}", {}, Thistle.TemplateSyntaxError],
        'basic-syntax15': ["{{ sp%am }}", {}, Thistle.TemplateSyntaxError],
        'basic-syntax16': ["{{ eggs! }}", {}, Thistle.TemplateSyntaxError],
        'basic-syntax17': ["{{ moo? }}", {}, Thistle.TemplateSyntaxError],

        // Attribute syntax allows a template to call a dictionary key's value
        'basic-syntax18': ["{{ foo.bar }}", {"foo" : {"bar" : "baz"}}, "baz"],

        // Fail silently when a variable's dictionary key isn't found
        'basic-syntax19': ["{{ foo.spam }}", {"foo" : {"bar" : "baz"}}, ("","INVALID")],

        // Fail silently when accessing a non-simple method
        'basic-syntax20': ["{{ var.method2 }}", {"var": new Object()}, ("","INVALID")],

        // Don't get confused when parsing something that is almost, but not
        // quite, a template tag.
        'basic-syntax21': ["a {{ moo %} b", {}, "a {{ moo %} b"],
        'basic-syntax22': ["{{ moo #}", {}, "{{ moo #}"],

        // Will try to treat "moo #} {{ cow" as the variable. Not ideal, but
        // costly to work around, so this triggers an error.
        'basic-syntax23': ["{{ moo #} {{ cow }}", {"cow": "cow"}, Thistle.TemplateSyntaxError],

        // Embedded newlines make it not-a-tag.
        'basic-syntax24': ["{{ moo\n }}", {}, "{{ moo\n }}"],


        // Literal strings are permitted inside variables, mostly for i18n
        // purposes.
        'basic-syntax25': ['{{ "fred" }}', {}, "fred"],
/*
        'basic-syntax26': [r'{{ "\"fred\"" }}', {}, "\"fred\""],
        'basic-syntax27': [r'{{ _("\"fred\"") }}', {}, "\"fred\""],
*/

        // regression test for ticket #12554
        // make sure a silent_variable_failure Exception is supressed
        // on dictionary and attribute lookup
        'basic-syntax28': ["{{ a.b }}", {'a': new SilentGetItemClass()}, ('', 'INVALID')],
        'basic-syntax29': ["{{ a.b }}", {'a': new SilentAttrClass()}, ('', 'INVALID')],

        // Something that starts like a number but has an extra lookup works as a lookup.
        'basic-syntax30': ["{{ 1.2.3 }}", {"1": {"2": {"3": "d"}}}, "d"],
        'basic-syntax31': ["{{ 1.2.3 }}", {"1": {"2": ["a", "b", "c", "d"]}}, "d"],
        'basic-syntax32': ["{{ 1.2.3 }}", {"1": [["x", "x", "x", "x"], ["y", "y", "y", "y"], ["a", "b", "c", "d"]]}, "d"],
        'basic-syntax33': ["{{ 1.2.3 }}", {"1": ["xxxx", "yyyy", "abcd"]}, "d"],
        'basic-syntax34': ["{{ 1.2.3 }}", {"1": [{"x": "x"}, {"y": "y"}, {"z": "z", "3": "d"}]}, "d"],

        // Numbers are numbers even if their digits are in the context.
        'basic-syntax35': ["{{ 1 }}", {"1": "abc"}, "1"],
        'basic-syntax36': ["{{ 1.2 }}", {"1": "abc"}, "1.2"],

        // Call methods in the top level of the context
        'basic-syntax37': ['{{ callable }}', {"callable": function() { return "foo bar"}}, "foo bar"],

        // Call methods returned from dictionary lookups
        'basic-syntax38': ['{{ var.callable }}', {"var": {"callable": function() { return "foo bar"}}}, "foo bar"],

        // List-index syntax allows a template to access a certain item of a subscriptable object.
        'list-index01': ["{{ var.1 }}", {"var": ["first item", "second item"]}, "second item"],

        // Fail silently when the list index is out of range.
        'list-index02': ["{{ var.5 }}", {"var": ["first item", "second item"]}, "INVALID"],

        // Fail silently when the variable is not a subscriptable object.
        'list-index03': ["{{ var.1 }}", {"var": null}, "INVALID"],

        // Fail silently when variable is a dict without the specified key.
        'list-index04': ["{{ var.1 }}", {"var": {}}, "INVALID"],

        // Dictionary lookup wins out when dict's key is a string.
        'list-index05': ["{{ var.1 }}", {"var": {'1': "hello"}}, "hello"],

        // But list-index lookup wins out when dict's key is an int, which
        // behind the scenes is really a dictionary lookup (for a dict)
        // after converting the key to an int.
        'list-index06': ["{{ var.1 }}", {"var": {1: "hello"}}, "hello"],

        // Dictionary lookup wins out when there is a string and int version of the key.
        // *** Not a valid Javascript test ***
        //'list-index07': ["{{ var.1 }}", {"var": {'1': "hello", 1: "world"}}, "hello"],

        // Basic filter usage
        'filter-syntax01': ["{{ var|upper }}", {"var": "Django is the greatest!"}, "DJANGO IS THE GREATEST!"],

        // Chained filters
        'filter-syntax02': ["{{ var|upper|lower }}", {"var": "Django is the greatest!"}, "django is the greatest!"],

        // Raise TemplateSyntaxError for space between a variable and filter pipe
        'filter-syntax03': ["{{ var |upper }}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError for space after a filter pipe
        'filter-syntax04': ["{{ var| upper }}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError for a nonexistent filter
        'filter-syntax05': ["{{ var|does_not_exist }}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError when trying to access a filter containing an illegal character
        'filter-syntax06': ["{{ var|fil(ter) }}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError for invalid block tags
        'filter-syntax07': ["{% nothing_to_see_here %}", {}, Thistle.TemplateSyntaxError],

        // Raise TemplateSyntaxError for empty block tags
        'filter-syntax08': ["{% %}", {}, Thistle.TemplateSyntaxError],

        /* TODO - need removetags filter
        // Chained filters, with an argument to the first one
        'filter-syntax09': ['{{ var|removetags:"b i"|upper|lower }}', {"var": "<b><i>Yes</i></b>"}, "yes"],
        */

        // Literal string as argument is always "safe" from auto-escaping..
        'filter-syntax10': ['{{ var|default_if_none:" endquote\\" hah" }}', {"var": null}, ' endquote" hah'],

        /// Variable as argument
        'filter-syntax11': ['{{ var|default_if_none:var2 }}', {"var": null, "var2": "happy"}, 'happy'],

        // Default argument testing
        'filter-syntax12': ['{{ var|yesno:"yup,nup,mup" }} {{ var|yesno }}', {"var": true}, 'yup yes'],

/*
            # Fail silently for methods that raise an exception with a
            # "silent_variable_failure" attribute
            'filter-syntax13': (r'1{{ var.method3 }}2', {"var": SomeClass()}, ("12", "1INVALID2")),

            # In methods that raise an exception without a
            # "silent_variable_attribute" set to True, the exception propagates
            'filter-syntax14': (r'1{{ var.method4 }}2', {"var": SomeClass()}, (SomeOtherException, SomeOtherException, template.TemplateSyntaxError)),
*/

        // Escaped backslash in argument
        'filter-syntax15': ['{{ var|default_if_none:"foo\\bar" }}', {"var": null}, 'foo\\bar'],

        // Escaped backslash using known escape char
        'filter-syntax16': ['{{ var|default_if_none:"foo\\now" }}', {"var": null}, 'foo\\now'],

        // Empty strings can be passed as arguments to filters
        'filter-syntax17': ['{{ var|join:"" }}', {'var': ['a', 'b', 'c']}, 'abc'],

/*
            # Make sure that any unicode strings are converted to bytestrings
            # in the final output.
            'filter-syntax18': (r'{{ var }}', {'var': UTF8Class()}, u'\u0160\u0110\u0106\u017d\u0107\u017e\u0161\u0111'),
*/

            // Numbers as filter arguments should work
            'filter-syntax19': ['{{ var|truncatewords:1 }}', {"var": "hello world"}, "hello ..."],

            // filters should accept empty string constants
            'filter-syntax20': ['{{ ""|default_if_none:"was none" }}', {}, ""],

/*
            # Fail silently for non-callable attribute and dict lookups which
            # raise an exception with a "silent_variable_failure" attribute
            'filter-syntax21': (r'1{{ var.silent_fail_key }}2', {"var": SomeClass()}, ("12", "1INVALID2")),
            'filter-syntax22': (r'1{{ var.silent_fail_attribute }}2', {"var": SomeClass()}, ("12", "1INVALID2")),

            # In attribute and dict lookups that raise an unexpected exception
            # without a "silent_variable_attribute" set to True, the exception
            # propagates
            'filter-syntax23': (r'1{{ var.noisy_fail_key }}2', {"var": SomeClass()}, (SomeOtherException, SomeOtherException, template.TemplateSyntaxError)),
            'filter-syntax24': (r'1{{ var.noisy_fail_attribute }}2', {"var": SomeClass()}, (SomeOtherException, SomeOtherException, template.TemplateSyntaxError)),
*/

        //## COMMENT SYNTAX ########################################################
        'comment-syntax01': ["{# this is hidden #}hello", {}, "hello"],
        'comment-syntax02': ["{# this is hidden #}hello{# foo #}", {}, "hello"],

        // Comments can contain invalid stuff.
        'comment-syntax03': ["foo{#  {% if %}  #}", {}, "foo"],
        'comment-syntax04': ["foo{#  {% endblock %}  #}", {}, "foo"],
        'comment-syntax05': ["foo{#  {% somerandomtag %}  #}", {}, "foo"],
        'comment-syntax06': ["foo{# {% #}", {}, "foo"],
        'comment-syntax07': ["foo{# %} #}", {}, "foo"],
        'comment-syntax08': ["foo{# %} #}bar", {}, "foobar"],
        'comment-syntax09': ["foo{# {{ #}", {}, "foo"],
        'comment-syntax10': ["foo{# }} #}", {}, "foo"],
        'comment-syntax11': ["foo{# { #}", {}, "foo"],
        'comment-syntax12': ["foo{# } #}", {}, "foo"],

        //### COMMENT TAG ###########################################################
        'comment-tag01': ["{% comment %}this is hidden{% endcomment %}hello", {}, "hello"],
        'comment-tag02': ["{% comment %}this is hidden{% endcomment %}hello{% comment %}foo{% endcomment %}", {}, "hello"],

        //# Comment tag can contain invalid stuff.
        'comment-tag03': ["foo{% comment %} {% if %} {% endcomment %}", {}, "foo"],
        'comment-tag04': ["foo{% comment %} {% endblock %} {% endcomment %}", {}, "foo"],
        'comment-tag05': ["foo{% comment %} {% somerandomtag %} {% endcomment %}", {}, "foo"],

        //### CYCLE TAG #############################################################
        'cycle01': ['{% cycle a %}', {}, Thistle.TemplateSyntaxError],
        'cycle02': ['{% cycle a,b,c as abc %}{% cycle abc %}', {}, 'ab'],

        'cycle03': ['{% cycle a,b,c as abc %}{% cycle abc %}{% cycle abc %}', {}, 'abc'],
        'cycle04': ['{% cycle a,b,c as abc %}{% cycle abc %}{% cycle abc %}{% cycle abc %}', {}, 'abca'],
        'cycle05': ['{% cycle %}', {}, Thistle.TemplateSyntaxError],
        'cycle06': ['{% cycle a %}', {}, Thistle.TemplateSyntaxError],
        'cycle07': ['{% cycle a,b,c as foo %}{% cycle bar %}', {}, Thistle.TemplateSyntaxError],
        'cycle08': ['{% cycle a,b,c as foo %}{% cycle foo %}{{ foo }}{{ foo }}{% cycle foo %}{{ foo }}', {}, 'abbbcc'],
        /*
            'cycle09': ("{% for i in test %}{% cycle a,b %}{{ i }},{% endfor %}", {'test': range(5)}, 'a0,b1,a2,b3,a4,'),
        */
        'cycle10': ["{% cycle 'a' 'b' 'c' as abc %}{% cycle abc %}", {}, 'ab'],
        'cycle11': ["{% cycle 'a' 'b' 'c' as abc %}{% cycle abc %}{% cycle abc %}", {}, 'abc'],
        'cycle12': ["{% cycle 'a' 'b' 'c' as abc %}{% cycle abc %}{% cycle abc %}{% cycle abc %}", {}, 'abca'],
        /*
            'cycle13': ("{% for i in test %}{% cycle 'a' 'b' %}{{ i }},{% endfor %}", {'test': range(5)}, 'a0,b1,a2,b3,a4,'),
        */
        'cycle14': ["{% cycle one two as foo %}{% cycle foo %}", {'one': '1','two': '2'}, '12'],
        /*
            'cycle15': ("{% for i in test %}{% cycle aye bee %}{{ i }},{% endfor %}", {'test': range(5), 'aye': 'a', 'bee': 'b'}, 'a0,b1,a2,b3,a4,'),
        */
        'cycle16': ["{% cycle one|lower two as foo %}{% cycle foo %}", {'one': 'A','two': '2'}, 'a2'],
        'cycle17': ["{% cycle 'a' 'b' 'c' as abc silent %}{% cycle abc %}{% cycle abc %}{% cycle abc %}{% cycle abc %}", {}, ""],
        'cycle18': ["{% cycle 'a' 'b' 'c' as foo invalid_flag %}", {}, Thistle.TemplateSyntaxError],
        'cycle19': ["{% cycle 'a' 'b' as silent %}{% cycle silent %}", {}, "ab"],
        'cycle20': ["{% cycle one two as foo %} &amp; {% cycle foo %}", {'one' : 'A & B', 'two' : 'C & D'}, "A & B &amp; C & D"],
        /*
            'cycle21': ("{% filter force_escape %}{% cycle one two as foo %} & {% cycle foo %}{% endfilter %}", {'one' : 'A & B', 'two' : 'C & D'}, "A &amp; B &amp; C &amp; D"),
            'cycle22': ("{% for x in values %}{% cycle 'a' 'b' 'c' as abc silent %}{{ x }}{% endfor %}", {'values': [1,2,3,4]}, "1234"),
            'cycle23': ("{% for x in values %}{% cycle 'a' 'b' 'c' as abc silent %}{{ abc }}{{ x }}{% endfor %}", {'values': [1,2,3,4]}, "a1b2c3a4"),
            'included-cycle': ('{{ abc }}', {'abc': 'xxx'}, 'xxx'),
            'cycle24': ("{% for x in values %}{% cycle 'a' 'b' 'c' as abc silent %}{% include 'included-cycle' %}{% endfor %}", {'values': [1,2,3,4]}, "abca"),
        */

            /*
            ### EXCEPTIONS ############################################################

            # Raise exception for invalid template name
            'exception01': ("{% extends 'nonexistent' %}", {}, (template.TemplateDoesNotExist, template.TemplateDoesNotExist, template.TemplateSyntaxError)),

            # Raise exception for invalid template name (in variable)
            'exception02': ("{% extends nonexistent %}", {}, (template.TemplateSyntaxError, template.TemplateDoesNotExist)),

            # Raise exception for extra {% extends %} tags
            'exception03': ("{% extends 'inheritance01' %}{% block first %}2{% endblock %}{% extends 'inheritance16' %}", {}, template.TemplateSyntaxError),

            # Raise exception for custom tags used in child with {% load %} tag in parent, not in child
            'exception04': ("{% extends 'inheritance17' %}{% block first %}{% echo 400 %}5678{% endblock %}", {}, template.TemplateSyntaxError),

            ### FILTER TAG ############################################################
            'filter01': ('{% filter upper %}{% endfilter %}', {}, ''),
            'filter02': ('{% filter upper %}django{% endfilter %}', {}, 'DJANGO'),
            'filter03': ('{% filter upper|lower %}django{% endfilter %}', {}, 'django'),
            'filter04': ('{% filter cut:remove %}djangospam{% endfilter %}', {'remove': 'spam'}, 'django'),

            ### FIRSTOF TAG ###########################################################
            'firstof01': ('{% firstof a b c %}', {'a':0,'b':0,'c':0}, ''),
            'firstof02': ('{% firstof a b c %}', {'a':1,'b':0,'c':0}, '1'),
            'firstof03': ('{% firstof a b c %}', {'a':0,'b':2,'c':0}, '2'),
            'firstof04': ('{% firstof a b c %}', {'a':0,'b':0,'c':3}, '3'),
            'firstof05': ('{% firstof a b c %}', {'a':1,'b':2,'c':3}, '1'),
            'firstof06': ('{% firstof a b c %}', {'b':0,'c':3}, '3'),
            'firstof07': ('{% firstof a b "c" %}', {'a':0}, 'c'),
            'firstof08': ('{% firstof a b "c and d" %}', {'a':0,'b':0}, 'c and d'),
            'firstof09': ('{% firstof %}', {}, template.TemplateSyntaxError),
        */

        //### FOR TAG ###############################################################
        'for-tag01': ["{% for val in values %}{{ val }}{% endfor %}", {"values": [1, 2, 3]}, "123"],

        'for-tag02': ["{% for val in values reversed %}{{ val }}{% endfor %}", {"values": [1, 2, 3]}, "321"],
        'for-tag-vars01': ["{% for val in values %}{{ forloop.counter }}{% endfor %}", {"values": [6, 6, 6]}, "123"],
        'for-tag-vars02': ["{% for val in values %}{{ forloop.counter0 }}{% endfor %}", {"values": [6, 6, 6]}, "012"],
        'for-tag-vars03': ["{% for val in values %}{{ forloop.revcounter }}{% endfor %}", {"values": [6, 6, 6]}, "321"],
        'for-tag-vars04': ["{% for val in values %}{{ forloop.revcounter0 }}{% endfor %}", {"values": [6, 6, 6]}, "210"],

        /*
            'for-tag-vars05': ("{% for val in values %}{% if forloop.first %}f{% else %}x{% endif %}{% endfor %}", {"values": [6, 6, 6]}, "fxx"),
            'for-tag-vars06': ("{% for val in values %}{% if forloop.last %}l{% else %}x{% endif %}{% endfor %}", {"values": [6, 6, 6]}, "xxl"),
        */
        'for-tag-unpack01': ["{% for key,value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, "one:1/two:2/"],
        'for-tag-unpack03': ["{% for key, value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, "one:1/two:2/"],
        'for-tag-unpack04': ["{% for key , value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, "one:1/two:2/"],
        'for-tag-unpack05': ["{% for key ,value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, "one:1/two:2/"],
        'for-tag-unpack06': ["{% for key value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, Thistle.TemplateSyntaxError],
        'for-tag-unpack07': ["{% for key,,value in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, Thistle.TemplateSyntaxError],
        'for-tag-unpack08': ["{% for key,value, in items %}{{ key }}:{{ value }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, Thistle.TemplateSyntaxError],
        // Ensure that a single loopvar doesn't truncate the list in val.
        'for-tag-unpack09': ["{% for val in items %}{{ val.0 }}:{{ val.1 }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, "one:1/two:2/"],
        // Otherwise, silently truncate if the length of loopvars differs to the length of each set of items.
        'for-tag-unpack10': ["{% for x,y in items %}{{ x }}:{{ y }}/{% endfor %}", {"items": [['one', 1, 'carrot'], ['two', 2, 'orange']]}, "one:1/two:2/"],
        'for-tag-unpack11': ["{% for x,y,z in items %}{{ x }}:{{ y }},{{ z }}/{% endfor %}", {"items": [['one', 1], ['two', 2]]}, ["one:1,/two:2,/", "one:1,INVALID/two:2,INVALID/"]],
        'for-tag-unpack12': ["{% for x,y,z in items %}{{ x }}:{{ y }},{{ z }}/{% endfor %}", {"items": [['one', 1, 'carrot'], ['two', 2]]}, ["one:1,carrot/two:2,/", "one:1,carrot/two:2,INVALID/"]],
        'for-tag-unpack13': ["{% for x,y,z in items %}{{ x }}:{{ y }},{{ z }}/{% endfor %}", {"items": [['one', 1, 'carrot'], ['two', 2, 'cheese']]}, ("one:1,carrot/two:2,cheese/", "one:1,carrot/two:2,cheese/")],
        'for-tag-unpack14': ["{% for x,y in items %}{{ x }}:{{ y }}/{% endfor %}", {"items": [1, 2]}, [":/:/", "INVALID:INVALID/INVALID:INVALID/"]],

        'for-tag-empty01': ["{% for val in values %}{{ val }}{% empty %}empty text{% endfor %}", {"values": [1, 2, 3]}, "123"],
        'for-tag-empty02': ["{% for val in values %}{{ val }}{% empty %}values array empty{% endfor %}", {"values": []}, "values array empty"],
        'for-tag-empty03': ["{% for val in values %}{{ val }}{% empty %}values array not found{% endfor %}", {}, "values array not found"],

        /*
            ### IF TAG ################################################################
            'if-tag01': ("{% if foo %}yes{% else %}no{% endif %}", {"foo": True}, "yes"),
            'if-tag02': ("{% if foo %}yes{% else %}no{% endif %}", {"foo": False}, "no"),
            'if-tag03': ("{% if foo %}yes{% else %}no{% endif %}", {}, "no"),

            # Filters
            'if-tag-filter01': ("{% if foo|length == 5 %}yes{% else %}no{% endif %}", {'foo': 'abcde'}, "yes"),
            'if-tag-filter02': ("{% if foo|upper == 'ABC' %}yes{% else %}no{% endif %}", {}, "no"),

            # Equality
            'if-tag-eq01': ("{% if foo == bar %}yes{% else %}no{% endif %}", {}, "yes"),
            'if-tag-eq02': ("{% if foo == bar %}yes{% else %}no{% endif %}", {'foo': 1}, "no"),
            'if-tag-eq03': ("{% if foo == bar %}yes{% else %}no{% endif %}", {'foo': 1, 'bar': 1}, "yes"),
            'if-tag-eq04': ("{% if foo == bar %}yes{% else %}no{% endif %}", {'foo': 1, 'bar': 2}, "no"),
            'if-tag-eq05': ("{% if foo == '' %}yes{% else %}no{% endif %}", {}, "no"),

            # Comparison
            'if-tag-gt-01': ("{% if 2 > 1 %}yes{% else %}no{% endif %}", {}, "yes"),
            'if-tag-gt-02': ("{% if 1 > 1 %}yes{% else %}no{% endif %}", {}, "no"),
            'if-tag-gte-01': ("{% if 1 >= 1 %}yes{% else %}no{% endif %}", {}, "yes"),
            'if-tag-gte-02': ("{% if 1 >= 2 %}yes{% else %}no{% endif %}", {}, "no"),
            'if-tag-lt-01': ("{% if 1 < 2 %}yes{% else %}no{% endif %}", {}, "yes"),
            'if-tag-lt-02': ("{% if 1 < 1 %}yes{% else %}no{% endif %}", {}, "no"),
            'if-tag-lte-01': ("{% if 1 <= 1 %}yes{% else %}no{% endif %}", {}, "yes"),
            'if-tag-lte-02': ("{% if 2 <= 1 %}yes{% else %}no{% endif %}", {}, "no"),

            # Contains
            'if-tag-in-01': ("{% if 1 in x %}yes{% else %}no{% endif %}", {'x':[1]}, "yes"),
            'if-tag-in-02': ("{% if 2 in x %}yes{% else %}no{% endif %}", {'x':[1]}, "no"),
            'if-tag-not-in-01': ("{% if 1 not in x %}yes{% else %}no{% endif %}", {'x':[1]}, "no"),
            'if-tag-not-in-02': ("{% if 2 not in x %}yes{% else %}no{% endif %}", {'x':[1]}, "yes"),

            # AND
            'if-tag-and01': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'yes'),
            'if-tag-and02': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'no'),
            'if-tag-and03': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'no'),
            'if-tag-and04': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'no'),
            'if-tag-and05': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': False}, 'no'),
            'if-tag-and06': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'bar': False}, 'no'),
            'if-tag-and07': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'foo': True}, 'no'),
            'if-tag-and08': ("{% if foo and bar %}yes{% else %}no{% endif %}", {'bar': True}, 'no'),

            # OR
            'if-tag-or01': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'yes'),
            'if-tag-or02': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'yes'),
            'if-tag-or03': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'yes'),
            'if-tag-or04': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'no'),
            'if-tag-or05': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': False}, 'no'),
            'if-tag-or06': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'bar': False}, 'no'),
            'if-tag-or07': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'foo': True}, 'yes'),
            'if-tag-or08': ("{% if foo or bar %}yes{% else %}no{% endif %}", {'bar': True}, 'yes'),

            # multiple ORs
            'if-tag-or09': ("{% if foo or bar or baz %}yes{% else %}no{% endif %}", {'baz': True}, 'yes'),

            # NOT
            'if-tag-not01': ("{% if not foo %}no{% else %}yes{% endif %}", {'foo': True}, 'yes'),
            'if-tag-not02': ("{% if not not foo %}no{% else %}yes{% endif %}", {'foo': True}, 'no'),
            # not03 to not05 removed, now TemplateSyntaxErrors

            'if-tag-not06': ("{% if foo and not bar %}yes{% else %}no{% endif %}", {}, 'no'),
            'if-tag-not07': ("{% if foo and not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'no'),
            'if-tag-not08': ("{% if foo and not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'yes'),
            'if-tag-not09': ("{% if foo and not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'no'),
            'if-tag-not10': ("{% if foo and not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'no'),

            'if-tag-not11': ("{% if not foo and bar %}yes{% else %}no{% endif %}", {}, 'no'),
            'if-tag-not12': ("{% if not foo and bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'no'),
            'if-tag-not13': ("{% if not foo and bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'no'),
            'if-tag-not14': ("{% if not foo and bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'yes'),
            'if-tag-not15': ("{% if not foo and bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'no'),

            'if-tag-not16': ("{% if foo or not bar %}yes{% else %}no{% endif %}", {}, 'yes'),
            'if-tag-not17': ("{% if foo or not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'yes'),
            'if-tag-not18': ("{% if foo or not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'yes'),
            'if-tag-not19': ("{% if foo or not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'no'),
            'if-tag-not20': ("{% if foo or not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'yes'),

            'if-tag-not21': ("{% if not foo or bar %}yes{% else %}no{% endif %}", {}, 'yes'),
            'if-tag-not22': ("{% if not foo or bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'yes'),
            'if-tag-not23': ("{% if not foo or bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'no'),
            'if-tag-not24': ("{% if not foo or bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'yes'),
            'if-tag-not25': ("{% if not foo or bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'yes'),

            'if-tag-not26': ("{% if not foo and not bar %}yes{% else %}no{% endif %}", {}, 'yes'),
            'if-tag-not27': ("{% if not foo and not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'no'),
            'if-tag-not28': ("{% if not foo and not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'no'),
            'if-tag-not29': ("{% if not foo and not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'no'),
            'if-tag-not30': ("{% if not foo and not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'yes'),

            'if-tag-not31': ("{% if not foo or not bar %}yes{% else %}no{% endif %}", {}, 'yes'),
            'if-tag-not32': ("{% if not foo or not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': True}, 'no'),
            'if-tag-not33': ("{% if not foo or not bar %}yes{% else %}no{% endif %}", {'foo': True, 'bar': False}, 'yes'),
            'if-tag-not34': ("{% if not foo or not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': True}, 'yes'),
            'if-tag-not35': ("{% if not foo or not bar %}yes{% else %}no{% endif %}", {'foo': False, 'bar': False}, 'yes'),

            # Various syntax errors
            'if-tag-error01': ("{% if %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error02': ("{% if foo and %}yes{% else %}no{% endif %}", {'foo': True}, template.TemplateSyntaxError),
            'if-tag-error03': ("{% if foo or %}yes{% else %}no{% endif %}", {'foo': True}, template.TemplateSyntaxError),
            'if-tag-error04': ("{% if not foo and %}yes{% else %}no{% endif %}", {'foo': True}, template.TemplateSyntaxError),
            'if-tag-error05': ("{% if not foo or %}yes{% else %}no{% endif %}", {'foo': True}, template.TemplateSyntaxError),
            'if-tag-error06': ("{% if abc def %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error07': ("{% if not %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error08': ("{% if and %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error09': ("{% if or %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error10': ("{% if == %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error11': ("{% if 1 == %}yes{% endif %}", {}, template.TemplateSyntaxError),
            'if-tag-error12': ("{% if a not b %}yes{% endif %}", {}, template.TemplateSyntaxError),

            # If evaluations are shortcircuited where possible
            # These tests will fail by taking too long to run. When the if clause
            # is shortcircuiting correctly, the is_bad() function shouldn't be
            # evaluated, and the deliberate sleep won't happen.
            'if-tag-shortcircuit01': ('{% if x.is_true or x.is_bad %}yes{% else %}no{% endif %}', {'x': TestObj()}, "yes"),
            'if-tag-shortcircuit02': ('{% if x.is_false and x.is_bad %}yes{% else %}no{% endif %}', {'x': TestObj()}, "no"),

            # Non-existent args
            'if-tag-badarg01':("{% if x|default_if_none:y %}yes{% endif %}", {}, ''),
            'if-tag-badarg02':("{% if x|default_if_none:y %}yes{% endif %}", {'y': 0}, ''),
            'if-tag-badarg03':("{% if x|default_if_none:y %}yes{% endif %}", {'y': 1}, 'yes'),
            'if-tag-badarg04':("{% if x|default_if_none:y %}yes{% else %}no{% endif %}", {}, 'no'),

            # Additional, more precise parsing tests are in SmartIfTests

            ### IFCHANGED TAG #########################################################
            'ifchanged01': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% endfor %}', {'num': (1,2,3)}, '123'),
            'ifchanged02': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% endfor %}', {'num': (1,1,3)}, '13'),
            'ifchanged03': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% endfor %}', {'num': (1,1,1)}, '1'),
            'ifchanged04': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% for x in numx %}{% ifchanged %}{{ x }}{% endifchanged %}{% endfor %}{% endfor %}', {'num': (1, 2, 3), 'numx': (2, 2, 2)}, '122232'),
            'ifchanged05': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% for x in numx %}{% ifchanged %}{{ x }}{% endifchanged %}{% endfor %}{% endfor %}', {'num': (1, 1, 1), 'numx': (1, 2, 3)}, '1123123123'),
            'ifchanged06': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% for x in numx %}{% ifchanged %}{{ x }}{% endifchanged %}{% endfor %}{% endfor %}', {'num': (1, 1, 1), 'numx': (2, 2, 2)}, '1222'),
            'ifchanged07': ('{% for n in num %}{% ifchanged %}{{ n }}{% endifchanged %}{% for x in numx %}{% ifchanged %}{{ x }}{% endifchanged %}{% for y in numy %}{% ifchanged %}{{ y }}{% endifchanged %}{% endfor %}{% endfor %}{% endfor %}', {'num': (1, 1, 1), 'numx': (2, 2, 2), 'numy': (3, 3, 3)}, '1233323332333'),
            'ifchanged08': ('{% for data in datalist %}{% for c,d in data %}{% if c %}{% ifchanged %}{{ d }}{% endifchanged %}{% endif %}{% endfor %}{% endfor %}', {'datalist': [[(1, 'a'), (1, 'a'), (0, 'b'), (1, 'c')], [(0, 'a'), (1, 'c'), (1, 'd'), (1, 'd'), (0, 'e')]]}, 'accd'),

            # Test one parameter given to ifchanged.
            'ifchanged-param01': ('{% for n in num %}{% ifchanged n %}..{% endifchanged %}{{ n }}{% endfor %}', { 'num': (1,2,3) }, '..1..2..3'),
            'ifchanged-param02': ('{% for n in num %}{% for x in numx %}{% ifchanged n %}..{% endifchanged %}{{ x }}{% endfor %}{% endfor %}', { 'num': (1,2,3), 'numx': (5,6,7) }, '..567..567..567'),

            # Test multiple parameters to ifchanged.
            'ifchanged-param03': ('{% for n in num %}{{ n }}{% for x in numx %}{% ifchanged x n %}{{ x }}{% endifchanged %}{% endfor %}{% endfor %}', { 'num': (1,1,2), 'numx': (5,6,6) }, '156156256'),

            # Test a date+hour like construct, where the hour of the last day
            # is the same but the date had changed, so print the hour anyway.
            'ifchanged-param04': ('{% for d in days %}{% ifchanged %}{{ d.day }}{% endifchanged %}{% for h in d.hours %}{% ifchanged d h %}{{ h }}{% endifchanged %}{% endfor %}{% endfor %}', {'days':[{'day':1, 'hours':[1,2,3]},{'day':2, 'hours':[3]},] }, '112323'),

            # Logically the same as above, just written with explicit
            # ifchanged for the day.
            'ifchanged-param05': ('{% for d in days %}{% ifchanged d.day %}{{ d.day }}{% endifchanged %}{% for h in d.hours %}{% ifchanged d.day h %}{{ h }}{% endifchanged %}{% endfor %}{% endfor %}', {'days':[{'day':1, 'hours':[1,2,3]},{'day':2, 'hours':[3]},] }, '112323'),

            # Test the else clause of ifchanged.
            'ifchanged-else01': ('{% for id in ids %}{{ id }}{% ifchanged id %}-first{% else %}-other{% endifchanged %},{% endfor %}', {'ids': [1,1,2,2,2,3]}, '1-first,1-other,2-first,2-other,2-other,3-first,'),

            'ifchanged-else02': ('{% for id in ids %}{{ id }}-{% ifchanged id %}{% cycle red,blue %}{% else %}grey{% endifchanged %},{% endfor %}', {'ids': [1,1,2,2,2,3]}, '1-red,1-grey,2-blue,2-grey,2-grey,3-red,'),
            'ifchanged-else03': ('{% for id in ids %}{{ id }}{% ifchanged id %}-{% cycle red,blue %}{% else %}{% endifchanged %},{% endfor %}', {'ids': [1,1,2,2,2,3]}, '1-red,1,2-blue,2,2,3-red,'),

            'ifchanged-else04': ('{% for id in ids %}{% ifchanged %}***{{ id }}*{% else %}...{% endifchanged %}{{ forloop.counter }}{% endfor %}', {'ids': [1,1,2,2,2,3,4]}, '***1*1...2***2*3...4...5***3*6***4*7'),

            ### IFEQUAL TAG ###########################################################
            'ifequal01': ("{% ifequal a b %}yes{% endifequal %}", {"a": 1, "b": 2}, ""),
            'ifequal02': ("{% ifequal a b %}yes{% endifequal %}", {"a": 1, "b": 1}, "yes"),
            'ifequal03': ("{% ifequal a b %}yes{% else %}no{% endifequal %}", {"a": 1, "b": 2}, "no"),
            'ifequal04': ("{% ifequal a b %}yes{% else %}no{% endifequal %}", {"a": 1, "b": 1}, "yes"),
            'ifequal05': ("{% ifequal a 'test' %}yes{% else %}no{% endifequal %}", {"a": "test"}, "yes"),
            'ifequal06': ("{% ifequal a 'test' %}yes{% else %}no{% endifequal %}", {"a": "no"}, "no"),
            'ifequal07': ('{% ifequal a "test" %}yes{% else %}no{% endifequal %}', {"a": "test"}, "yes"),
            'ifequal08': ('{% ifequal a "test" %}yes{% else %}no{% endifequal %}', {"a": "no"}, "no"),
            'ifequal09': ('{% ifequal a "test" %}yes{% else %}no{% endifequal %}', {}, "no"),
            'ifequal10': ('{% ifequal a b %}yes{% else %}no{% endifequal %}', {}, "yes"),

            # SMART SPLITTING
            'ifequal-split01': ('{% ifequal a "test man" %}yes{% else %}no{% endifequal %}', {}, "no"),
            'ifequal-split02': ('{% ifequal a "test man" %}yes{% else %}no{% endifequal %}', {'a': 'foo'}, "no"),
            'ifequal-split03': ('{% ifequal a "test man" %}yes{% else %}no{% endifequal %}', {'a': 'test man'}, "yes"),
            'ifequal-split04': ("{% ifequal a 'test man' %}yes{% else %}no{% endifequal %}", {'a': 'test man'}, "yes"),
            'ifequal-split05': ("{% ifequal a 'i \"love\" you' %}yes{% else %}no{% endifequal %}", {'a': ''}, "no"),
            'ifequal-split06': ("{% ifequal a 'i \"love\" you' %}yes{% else %}no{% endifequal %}", {'a': 'i "love" you'}, "yes"),
            'ifequal-split07': ("{% ifequal a 'i \"love\" you' %}yes{% else %}no{% endifequal %}", {'a': 'i love you'}, "no"),
            'ifequal-split08': (r"{% ifequal a 'I\'m happy' %}yes{% else %}no{% endifequal %}", {'a': "I'm happy"}, "yes"),
            'ifequal-split09': (r"{% ifequal a 'slash\man' %}yes{% else %}no{% endifequal %}", {'a': r"slash\man"}, "yes"),
            'ifequal-split10': (r"{% ifequal a 'slash\man' %}yes{% else %}no{% endifequal %}", {'a': r"slashman"}, "no"),

            # NUMERIC RESOLUTION
            'ifequal-numeric01': ('{% ifequal x 5 %}yes{% endifequal %}', {'x': '5'}, ''),
            'ifequal-numeric02': ('{% ifequal x 5 %}yes{% endifequal %}', {'x': 5}, 'yes'),
            'ifequal-numeric03': ('{% ifequal x 5.2 %}yes{% endifequal %}', {'x': 5}, ''),
            'ifequal-numeric04': ('{% ifequal x 5.2 %}yes{% endifequal %}', {'x': 5.2}, 'yes'),
            'ifequal-numeric05': ('{% ifequal x 0.2 %}yes{% endifequal %}', {'x': .2}, 'yes'),
            'ifequal-numeric06': ('{% ifequal x .2 %}yes{% endifequal %}', {'x': .2}, 'yes'),
            'ifequal-numeric07': ('{% ifequal x 2. %}yes{% endifequal %}', {'x': 2}, ''),
            'ifequal-numeric08': ('{% ifequal x "5" %}yes{% endifequal %}', {'x': 5}, ''),
            'ifequal-numeric09': ('{% ifequal x "5" %}yes{% endifequal %}', {'x': '5'}, 'yes'),
            'ifequal-numeric10': ('{% ifequal x -5 %}yes{% endifequal %}', {'x': -5}, 'yes'),
            'ifequal-numeric11': ('{% ifequal x -5.2 %}yes{% endifequal %}', {'x': -5.2}, 'yes'),
            'ifequal-numeric12': ('{% ifequal x +5 %}yes{% endifequal %}', {'x': 5}, 'yes'),

            # FILTER EXPRESSIONS AS ARGUMENTS
            'ifequal-filter01': ('{% ifequal a|upper "A" %}x{% endifequal %}', {'a': 'a'}, 'x'),
            'ifequal-filter02': ('{% ifequal "A" a|upper %}x{% endifequal %}', {'a': 'a'}, 'x'),
            'ifequal-filter03': ('{% ifequal a|upper b|upper %}x{% endifequal %}', {'a': 'x', 'b': 'X'}, 'x'),
            'ifequal-filter04': ('{% ifequal x|slice:"1" "a" %}x{% endifequal %}', {'x': 'aaa'}, 'x'),
            'ifequal-filter05': ('{% ifequal x|slice:"1"|upper "A" %}x{% endifequal %}', {'x': 'aaa'}, 'x'),

            ### IFNOTEQUAL TAG ########################################################
            'ifnotequal01': ("{% ifnotequal a b %}yes{% endifnotequal %}", {"a": 1, "b": 2}, "yes"),
            'ifnotequal02': ("{% ifnotequal a b %}yes{% endifnotequal %}", {"a": 1, "b": 1}, ""),
            'ifnotequal03': ("{% ifnotequal a b %}yes{% else %}no{% endifnotequal %}", {"a": 1, "b": 2}, "yes"),
            'ifnotequal04': ("{% ifnotequal a b %}yes{% else %}no{% endifnotequal %}", {"a": 1, "b": 1}, "no"),

            ## INCLUDE TAG ###########################################################
            'include01': ('{% include "basic-syntax01" %}', {}, "something cool"),
            'include02': ('{% include "basic-syntax02" %}', {'headline': 'Included'}, "Included"),
            'include03': ('{% include template_name %}', {'template_name': 'basic-syntax02', 'headline': 'Included'}, "Included"),
            'include04': ('a{% include "nonexistent" %}b', {}, ("ab", "ab", template.TemplateDoesNotExist)),
            'include 05': ('template with a space', {}, 'template with a space'),
            'include06': ('{% include "include 05"%}', {}, 'template with a space'),

            # extra inline context
            'include07': ('{% include "basic-syntax02" with headline="Inline" %}', {'headline': 'Included'}, 'Inline'),
            'include08': ('{% include headline with headline="Dynamic" %}', {'headline': 'basic-syntax02'}, 'Dynamic'),
            'include09': ('{{ first }}--{% include "basic-syntax03" with first=second|lower|upper second=first|upper %}--{{ second }}', {'first': 'Ul', 'second': 'lU'}, 'Ul--LU --- UL--lU'),

            # isolated context
            'include10': ('{% include "basic-syntax03" only %}', {'first': '1'}, (' --- ', 'INVALID --- INVALID')),
            'include11': ('{% include "basic-syntax03" only with second=2 %}', {'first': '1'}, (' --- 2', 'INVALID --- 2')),
            'include12': ('{% include "basic-syntax03" with first=1 only %}', {'second': '2'}, ('1 --- ', '1 --- INVALID')),

            # autoescape context
            'include13': ('{% autoescape off %}{% include "basic-syntax03" %}{% endautoescape %}', {'first': '&'}, ('& --- ', '& --- INVALID')),
            'include14': ('{% autoescape off %}{% include "basic-syntax03" with first=var1 only %}{% endautoescape %}', {'var1': '&'}, ('& --- ', '& --- INVALID')),

            'include-error01': ('{% include "basic-syntax01" with %}', {}, template.TemplateSyntaxError),
            'include-error02': ('{% include "basic-syntax01" with "no key" %}', {}, template.TemplateSyntaxError),
            'include-error03': ('{% include "basic-syntax01" with dotted.arg="error" %}', {}, template.TemplateSyntaxError),
            'include-error04': ('{% include "basic-syntax01" something_random %}', {}, template.TemplateSyntaxError),
            'include-error05': ('{% include "basic-syntax01" foo="duplicate" foo="key" %}', {}, template.TemplateSyntaxError),
            'include-error06': ('{% include "basic-syntax01" only only %}', {}, template.TemplateSyntaxError),

            ### INCLUSION ERROR REPORTING #############################################
            'include-fail1': ('{% load bad_tag %}{% badtag %}', {}, RuntimeError),
            'include-fail2': ('{% load broken_tag %}', {}, template.TemplateSyntaxError),
            'include-error07': ('{% include "include-fail1" %}', {}, ('', '', RuntimeError)),
            'include-error08': ('{% include "include-fail2" %}', {}, ('', '', template.TemplateSyntaxError)),
            'include-error09': ('{% include failed_include %}', {'failed_include': 'include-fail1'}, ('', '', template.TemplateSyntaxError)),
            'include-error10': ('{% include failed_include %}', {'failed_include': 'include-fail2'}, ('', '', template.TemplateSyntaxError)),


            ### NAMED ENDBLOCKS #######################################################

            # Basic test
            'namedendblocks01': ("1{% block first %}_{% block second %}2{% endblock second %}_{% endblock first %}3", {}, '1_2_3'),

            # Unbalanced blocks
            'namedendblocks02': ("1{% block first %}_{% block second %}2{% endblock first %}_{% endblock second %}3", {}, template.TemplateSyntaxError),
            'namedendblocks03': ("1{% block first %}_{% block second %}2{% endblock %}_{% endblock second %}3", {}, template.TemplateSyntaxError),
            'namedendblocks04': ("1{% block first %}_{% block second %}2{% endblock second %}_{% endblock third %}3", {}, template.TemplateSyntaxError),
            'namedendblocks05': ("1{% block first %}_{% block second %}2{% endblock first %}", {}, template.TemplateSyntaxError),

            # Mixed named and unnamed endblocks
            'namedendblocks06': ("1{% block first %}_{% block second %}2{% endblock %}_{% endblock first %}3", {}, '1_2_3'),
            'namedendblocks07': ("1{% block first %}_{% block second %}2{% endblock second %}_{% endblock %}3", {}, '1_2_3'),

            ### INHERITANCE ###########################################################

            # Standard template with no inheritance
            'inheritance01': ("1{% block first %}&{% endblock %}3{% block second %}_{% endblock %}", {}, '1&3_'),

            # Standard two-level inheritance
            'inheritance02': ("{% extends 'inheritance01' %}{% block first %}2{% endblock %}{% block second %}4{% endblock %}", {}, '1234'),

            # Three-level with no redefinitions on third level
            'inheritance03': ("{% extends 'inheritance02' %}", {}, '1234'),

            # Two-level with no redefinitions on second level
            'inheritance04': ("{% extends 'inheritance01' %}", {}, '1&3_'),

            # Two-level with double quotes instead of single quotes
            'inheritance05': ('{% extends "inheritance02" %}', {}, '1234'),

            # Three-level with variable parent-template name
            'inheritance06': ("{% extends foo %}", {'foo': 'inheritance02'}, '1234'),

            # Two-level with one block defined, one block not defined
            'inheritance07': ("{% extends 'inheritance01' %}{% block second %}5{% endblock %}", {}, '1&35'),

            # Three-level with one block defined on this level, two blocks defined next level
            'inheritance08': ("{% extends 'inheritance02' %}{% block second %}5{% endblock %}", {}, '1235'),

            # Three-level with second and third levels blank
            'inheritance09': ("{% extends 'inheritance04' %}", {}, '1&3_'),

            # Three-level with space NOT in a block -- should be ignored
            'inheritance10': ("{% extends 'inheritance04' %}      ", {}, '1&3_'),

            # Three-level with both blocks defined on this level, but none on second level
            'inheritance11': ("{% extends 'inheritance04' %}{% block first %}2{% endblock %}{% block second %}4{% endblock %}", {}, '1234'),

            # Three-level with this level providing one and second level providing the other
            'inheritance12': ("{% extends 'inheritance07' %}{% block first %}2{% endblock %}", {}, '1235'),

            # Three-level with this level overriding second level
            'inheritance13': ("{% extends 'inheritance02' %}{% block first %}a{% endblock %}{% block second %}b{% endblock %}", {}, '1a3b'),

            # A block defined only in a child template shouldn't be displayed
            'inheritance14': ("{% extends 'inheritance01' %}{% block newblock %}NO DISPLAY{% endblock %}", {}, '1&3_'),

            # A block within another block
            'inheritance15': ("{% extends 'inheritance01' %}{% block first %}2{% block inner %}inner{% endblock %}{% endblock %}", {}, '12inner3_'),

            # A block within another block (level 2)
            'inheritance16': ("{% extends 'inheritance15' %}{% block inner %}out{% endblock %}", {}, '12out3_'),

            # {% load %} tag (parent -- setup for exception04)
            'inheritance17': ("{% load testtags %}{% block first %}1234{% endblock %}", {}, '1234'),

            # {% load %} tag (standard usage, without inheritance)
            'inheritance18': ("{% load testtags %}{% echo this that theother %}5678", {}, 'this that theother5678'),

            # {% load %} tag (within a child template)
            'inheritance19': ("{% extends 'inheritance01' %}{% block first %}{% load testtags %}{% echo 400 %}5678{% endblock %}", {}, '140056783_'),

            # Two-level inheritance with {{ block.super }}
            'inheritance20': ("{% extends 'inheritance01' %}{% block first %}{{ block.super }}a{% endblock %}", {}, '1&a3_'),

            # Three-level inheritance with {{ block.super }} from parent
            'inheritance21': ("{% extends 'inheritance02' %}{% block first %}{{ block.super }}a{% endblock %}", {}, '12a34'),

            # Three-level inheritance with {{ block.super }} from grandparent
            'inheritance22': ("{% extends 'inheritance04' %}{% block first %}{{ block.super }}a{% endblock %}", {}, '1&a3_'),

            # Three-level inheritance with {{ block.super }} from parent and grandparent
            'inheritance23': ("{% extends 'inheritance20' %}{% block first %}{{ block.super }}b{% endblock %}", {}, '1&ab3_'),

            # Inheritance from local context without use of template loader
            'inheritance24': ("{% extends context_template %}{% block first %}2{% endblock %}{% block second %}4{% endblock %}", {'context_template': template.Template("1{% block first %}_{% endblock %}3{% block second %}_{% endblock %}")}, '1234'),

            # Inheritance from local context with variable parent template
            'inheritance25': ("{% extends context_template.1 %}{% block first %}2{% endblock %}{% block second %}4{% endblock %}", {'context_template': [template.Template("Wrong"), template.Template("1{% block first %}_{% endblock %}3{% block second %}_{% endblock %}")]}, '1234'),

            # Set up a base template to extend
            'inheritance26': ("no tags", {}, 'no tags'),

            # Inheritance from a template that doesn't have any blocks
            'inheritance27': ("{% extends 'inheritance26' %}", {}, 'no tags'),

            # Set up a base template with a space in it.
            'inheritance 28': ("{% block first %}!{% endblock %}", {}, '!'),

            # Inheritance from a template with a space in its name should work.
            'inheritance29': ("{% extends 'inheritance 28' %}", {}, '!'),

            # Base template, putting block in a conditional {% if %} tag
            'inheritance30': ("1{% if optional %}{% block opt %}2{% endblock %}{% endif %}3", {'optional': True}, '123'),

            # Inherit from a template with block wrapped in an {% if %} tag (in parent), still gets overridden
            'inheritance31': ("{% extends 'inheritance30' %}{% block opt %}two{% endblock %}", {'optional': True}, '1two3'),
            'inheritance32': ("{% extends 'inheritance30' %}{% block opt %}two{% endblock %}", {}, '13'),

            # Base template, putting block in a conditional {% ifequal %} tag
            'inheritance33': ("1{% ifequal optional 1 %}{% block opt %}2{% endblock %}{% endifequal %}3", {'optional': 1}, '123'),

            # Inherit from a template with block wrapped in an {% ifequal %} tag (in parent), still gets overridden
            'inheritance34': ("{% extends 'inheritance33' %}{% block opt %}two{% endblock %}", {'optional': 1}, '1two3'),
            'inheritance35': ("{% extends 'inheritance33' %}{% block opt %}two{% endblock %}", {'optional': 2}, '13'),

            # Base template, putting block in a {% for %} tag
            'inheritance36': ("{% for n in numbers %}_{% block opt %}{{ n }}{% endblock %}{% endfor %}_", {'numbers': '123'}, '_1_2_3_'),

            # Inherit from a template with block wrapped in an {% for %} tag (in parent), still gets overridden
            'inheritance37': ("{% extends 'inheritance36' %}{% block opt %}X{% endblock %}", {'numbers': '123'}, '_X_X_X_'),
            'inheritance38': ("{% extends 'inheritance36' %}{% block opt %}X{% endblock %}", {}, '_'),

            # The super block will still be found.
            'inheritance39': ("{% extends 'inheritance30' %}{% block opt %}new{{ block.super }}{% endblock %}", {'optional': True}, '1new23'),
            'inheritance40': ("{% extends 'inheritance33' %}{% block opt %}new{{ block.super }}{% endblock %}", {'optional': 1}, '1new23'),
            'inheritance41': ("{% extends 'inheritance36' %}{% block opt %}new{{ block.super }}{% endblock %}", {'numbers': '123'}, '_new1_new2_new3_'),

            ### LOADING TAG LIBRARIES #################################################

            # {% load %} tag, importing individual tags
            'load1': ("{% load echo from testtags %}{% echo this that theother %}", {}, 'this that theother'),
            'load2': ("{% load echo other_echo from testtags %}{% echo this that theother %} {% other_echo and another thing %}", {}, 'this that theother and another thing'),
            'load3': ("{% load echo upper from testtags %}{% echo this that theother %} {{ statement|upper }}", {'statement': 'not shouting'}, 'this that theother NOT SHOUTING'),

            # {% load %} tag errors
            'load4': ("{% load echo other_echo bad_tag from testtags %}", {}, template.TemplateSyntaxError),
            'load5': ("{% load echo other_echo bad_tag from %}", {}, template.TemplateSyntaxError),
            'load6': ("{% load from testtags %}", {}, template.TemplateSyntaxError),
            'load7': ("{% load echo from bad_library %}", {}, template.TemplateSyntaxError),

            ### I18N ##################################################################

            # {% spaceless %} tag
            'spaceless01': ("{% spaceless %} <b>    <i> text </i>    </b> {% endspaceless %}", {}, "<b><i> text </i></b>"),
            'spaceless02': ("{% spaceless %} <b> \n <i> text </i> \n </b> {% endspaceless %}", {}, "<b><i> text </i></b>"),
            'spaceless03': ("{% spaceless %}<b><i>text</i></b>{% endspaceless %}", {}, "<b><i>text</i></b>"),
            'spaceless04': ("{% spaceless %}<b>   <i>{{ text }}</i>  </b>{% endspaceless %}", {'text' : 'This & that'}, "<b><i>This &amp; that</i></b>"),
            'spaceless05': ("{% autoescape off %}{% spaceless %}<b>   <i>{{ text }}</i>  </b>{% endspaceless %}{% endautoescape %}", {'text' : 'This & that'}, "<b><i>This & that</i></b>"),
            'spaceless06': ("{% spaceless %}<b>   <i>{{ text|safe }}</i>  </b>{% endspaceless %}", {'text' : 'This & that'}, "<b><i>This & that</i></b>"),

            # simple translation of a string delimited by '
            'i18n01': ("{% load i18n %}{% trans 'xxxyyyxxx' %}", {}, "xxxyyyxxx"),

            # simple translation of a string delimited by "
            'i18n02': ('{% load i18n %}{% trans "xxxyyyxxx" %}', {}, "xxxyyyxxx"),

            # simple translation of a variable
            'i18n03': ('{% load i18n %}{% blocktrans %}{{ anton }}{% endblocktrans %}', {'anton': '\xc3\x85'}, u"Å"),

            # simple translation of a variable and filter
            'i18n04': ('{% load i18n %}{% blocktrans with berta=anton|lower %}{{ berta }}{% endblocktrans %}', {'anton': '\xc3\x85'}, u'å'),
            'legacyi18n04': ('{% load i18n %}{% blocktrans with anton|lower as berta %}{{ berta }}{% endblocktrans %}', {'anton': '\xc3\x85'}, u'å'),

            # simple translation of a string with interpolation
            'i18n05': ('{% load i18n %}{% blocktrans %}xxx{{ anton }}xxx{% endblocktrans %}', {'anton': 'yyy'}, "xxxyyyxxx"),

            # simple translation of a string to german
            'i18n06': ('{% load i18n %}{% trans "Page not found" %}', {'LANGUAGE_CODE': 'de'}, "Seite nicht gefunden"),

            # translation of singular form
            'i18n07': ('{% load i18n %}{% blocktrans count counter=number %}singular{% plural %}{{ counter }} plural{% endblocktrans %}', {'number': 1}, "singular"),
            'legacyi18n07': ('{% load i18n %}{% blocktrans count number as counter %}singular{% plural %}{{ counter }} plural{% endblocktrans %}', {'number': 1}, "singular"),

            # translation of plural form
            'i18n08': ('{% load i18n %}{% blocktrans count number as counter %}singular{% plural %}{{ counter }} plural{% endblocktrans %}', {'number': 2}, "2 plural"),
            'legacyi18n08': ('{% load i18n %}{% blocktrans count counter=number %}singular{% plural %}{{ counter }} plural{% endblocktrans %}', {'number': 2}, "2 plural"),

            # simple non-translation (only marking) of a string to german
            'i18n09': ('{% load i18n %}{% trans "Page not found" noop %}', {'LANGUAGE_CODE': 'de'}, "Page not found"),

            # translation of a variable with a translated filter
            'i18n10': ('{{ bool|yesno:_("yes,no,maybe") }}', {'bool': True, 'LANGUAGE_CODE': 'de'}, 'Ja'),

            # translation of a variable with a non-translated filter
            'i18n11': ('{{ bool|yesno:"ja,nein" }}', {'bool': True}, 'ja'),

            # usage of the get_available_languages tag
            'i18n12': ('{% load i18n %}{% get_available_languages as langs %}{% for lang in langs %}{% ifequal lang.0 "de" %}{{ lang.0 }}{% endifequal %}{% endfor %}', {}, 'de'),

            # translation of constant strings
            'i18n13': ('{{ _("Password") }}', {'LANGUAGE_CODE': 'de'}, 'Passwort'),
            'i18n14': ('{% cycle "foo" _("Password") _(\'Password\') as c %} {% cycle c %} {% cycle c %}', {'LANGUAGE_CODE': 'de'}, 'foo Passwort Passwort'),
            'i18n15': ('{{ absent|default:_("Password") }}', {'LANGUAGE_CODE': 'de', 'absent': ""}, 'Passwort'),
            'i18n16': ('{{ _("<") }}', {'LANGUAGE_CODE': 'de'}, '<'),

            # Escaping inside blocktrans and trans works as if it was directly in the
            # template.
            'i18n17': ('{% load i18n %}{% blocktrans with berta=anton|escape %}{{ berta }}{% endblocktrans %}', {'anton': 'α & β'}, u'α &amp; β'),
            'i18n18': ('{% load i18n %}{% blocktrans with berta=anton|force_escape %}{{ berta }}{% endblocktrans %}', {'anton': 'α & β'}, u'α &amp; β'),
            'i18n19': ('{% load i18n %}{% blocktrans %}{{ andrew }}{% endblocktrans %}', {'andrew': 'a & b'}, u'a &amp; b'),
            'i18n20': ('{% load i18n %}{% trans andrew %}', {'andrew': 'a & b'}, u'a &amp; b'),
            'i18n21': ('{% load i18n %}{% blocktrans %}{{ andrew }}{% endblocktrans %}', {'andrew': mark_safe('a & b')}, u'a & b'),
            'i18n22': ('{% load i18n %}{% trans andrew %}', {'andrew': mark_safe('a & b')}, u'a & b'),
            'legacyi18n17': ('{% load i18n %}{% blocktrans with anton|escape as berta %}{{ berta }}{% endblocktrans %}', {'anton': 'α & β'}, u'α &amp; β'),
            'legacyi18n18': ('{% load i18n %}{% blocktrans with anton|force_escape as berta %}{{ berta }}{% endblocktrans %}', {'anton': 'α & β'}, u'α &amp; β'),

            # Use filters with the {% trans %} tag, #5972
            'i18n23': ('{% load i18n %}{% trans "Page not found"|capfirst|slice:"6:" %}', {'LANGUAGE_CODE': 'de'}, u'nicht gefunden'),
            'i18n24': ("{% load i18n %}{% trans 'Page not found'|upper %}", {'LANGUAGE_CODE': 'de'}, u'SEITE NICHT GEFUNDEN'),
            'i18n25': ('{% load i18n %}{% trans somevar|upper %}', {'somevar': 'Page not found', 'LANGUAGE_CODE': 'de'}, u'SEITE NICHT GEFUNDEN'),

            # translation of plural form with extra field in singular form (#13568)
            'i18n26': ('{% load i18n %}{% blocktrans with extra_field=myextra_field count counter=number %}singular {{ extra_field }}{% plural %}plural{% endblocktrans %}', {'number': 1, 'myextra_field': 'test'}, "singular test"),
            'legacyi18n26': ('{% load i18n %}{% blocktrans with myextra_field as extra_field count number as counter %}singular {{ extra_field }}{% plural %}plural{% endblocktrans %}', {'number': 1, 'myextra_field': 'test'}, "singular test"),

            # translation of singular form in russian (#14126)
            'i18n27': ('{% load i18n %}{% blocktrans count counter=number %}{{ counter }} result{% plural %}{{ counter }} results{% endblocktrans %}', {'number': 1, 'LANGUAGE_CODE': 'ru'}, u'1 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442'),
            'legacyi18n27': ('{% load i18n %}{% blocktrans count number as counter %}{{ counter }} result{% plural %}{{ counter }} results{% endblocktrans %}', {'number': 1, 'LANGUAGE_CODE': 'ru'}, u'1 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442'),

            # simple translation of multiple variables
            'i18n28': ('{% load i18n %}{% blocktrans with a=anton b=berta %}{{ a }} + {{ b }}{% endblocktrans %}', {'anton': 'α', 'berta': 'β'}, u'α + β'),
            'legacyi18n28': ('{% load i18n %}{% blocktrans with anton as a and berta as b %}{{ a }} + {{ b }}{% endblocktrans %}', {'anton': 'α', 'berta': 'β'}, u'α + β'),

            # retrieving language information
            'i18n28': ('{% load i18n %}{% get_language_info for "de" as l %}{{ l.code }}: {{ l.name }}/{{ l.name_local }} bidi={{ l.bidi }}', {}, 'de: German/Deutsch bidi=False'),
            'i18n29': ('{% load i18n %}{% get_language_info for LANGUAGE_CODE as l %}{{ l.code }}: {{ l.name }}/{{ l.name_local }} bidi={{ l.bidi }}', {'LANGUAGE_CODE': 'fi'}, 'fi: Finnish/suomi bidi=False'),
            'i18n30': ('{% load i18n %}{% get_language_info_list for langcodes as langs %}{% for l in langs %}{{ l.code }}: {{ l.name }}/{{ l.name_local }} bidi={{ l.bidi }}; {% endfor %}', {'langcodes': ['it', 'no']}, u'it: Italian/italiano bidi=False; no: Norwegian/Norsk bidi=False; '),
            'i18n31': ('{% load i18n %}{% get_language_info_list for langcodes as langs %}{% for l in langs %}{{ l.code }}: {{ l.name }}/{{ l.name_local }} bidi={{ l.bidi }}; {% endfor %}', {'langcodes': (('sl', 'Slovenian'), ('fa', 'Persian'))}, u'sl: Slovenian/Sloven\u0161\u010dina bidi=False; fa: Persian/\u0641\u0627\u0631\u0633\u06cc bidi=True; '),
            'i18n32': ('{% load i18n %}{{ "hu"|language_name }} {{ "hu"|language_name_local }} {{ "hu"|language_bidi }}', {}, u'Hungarian Magyar False'),
            'i18n33': ('{% load i18n %}{{ langcode|language_name }} {{ langcode|language_name_local }} {{ langcode|language_bidi }}', {'langcode': 'nl'}, u'Dutch Nederlands False'),

            # blocktrans handling of variables which are not in the context.
            'i18n34': ('{% load i18n %}{% blocktrans %}{{ missing }}{% endblocktrans %}', {}, u''),

            ### HANDLING OF TEMPLATE_STRING_IF_INVALID ###################################

            'invalidstr01': ('{{ var|default:"Foo" }}', {}, ('Foo','INVALID')),
            'invalidstr02': ('{{ var|default_if_none:"Foo" }}', {}, ('','INVALID')),
            'invalidstr03': ('{% for v in var %}({{ v }}){% endfor %}', {}, ''),
            'invalidstr04': ('{% if var %}Yes{% else %}No{% endif %}', {}, 'No'),
            'invalidstr04': ('{% if var|default:"Foo" %}Yes{% else %}No{% endif %}', {}, 'Yes'),
            'invalidstr05': ('{{ var }}', {}, ('', ('INVALID %s', 'var'))),
            'invalidstr06': ('{{ var.prop }}', {'var': {}}, ('', ('INVALID %s', 'var.prop'))),

            ### MULTILINE #############################################################
            */

            'multiline01': ["Hello,\n"
                           +"boys.\n"
                           +"How\n"
                           +"are\n"
                           +"you\n"
                           +"gentlemen.\n",
                           {},
                            "Hello,\n"
                           +"boys.\n"
                           +"How\n"
                           +"are\n"
                           +"you\n"
                           +"gentlemen.\n"],

            /*
            ### REGROUP TAG ###########################################################
            'regroup01': ('{% regroup data by bar as grouped %}' + \
                          '{% for group in grouped %}' + \
                          '{{ group.grouper }}:' + \
                          '{% for item in group.list %}' + \
                          '{{ item.foo }}' + \
                          '{% endfor %},' + \
                          '{% endfor %}',
                          {'data': [ {'foo':'c', 'bar':1},
                                     {'foo':'d', 'bar':1},
                                     {'foo':'a', 'bar':2},
                                     {'foo':'b', 'bar':2},
                                     {'foo':'x', 'bar':3}  ]},
                          '1:cd,2:ab,3:x,'),

            # Test for silent failure when target variable isn't found
            'regroup02': ('{% regroup data by bar as grouped %}' + \
                          '{% for group in grouped %}' + \
                          '{{ group.grouper }}:' + \
                          '{% for item in group.list %}' + \
                          '{{ item.foo }}' + \
                          '{% endfor %},' + \
                          '{% endfor %}',
                          {}, ''),
            ### SSI TAG ########################################################

            # Test normal behavior
            'old-ssi01': ('{%% ssi %s %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'ssi_include.html'), {}, 'This is for testing an ssi include. {{ test }}\n'),
            'old-ssi02': ('{%% ssi %s %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'not_here'), {}, ''),

            # Test parsed output
            'old-ssi06': ('{%% ssi %s parsed %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'ssi_include.html'), {'test': 'Look ma! It parsed!'}, 'This is for testing an ssi include. Look ma! It parsed!\n'),
            'old-ssi07': ('{%% ssi %s parsed %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'not_here'), {'test': 'Look ma! It parsed!'}, ''),

            # Future compatibility
            # Test normal behavior
            'ssi01': ('{%% load ssi from future %%}{%% ssi "%s" %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'ssi_include.html'), {}, 'This is for testing an ssi include. {{ test }}\n'),
            'ssi02': ('{%% load ssi from future %%}{%% ssi "%s" %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'not_here'), {}, ''),
            'ssi03': ("{%% load ssi from future %%}{%% ssi '%s' %%}" % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'not_here'), {}, ''),

            # Test passing as a variable
            'ssi04': ('{% load ssi from future %}{% ssi ssi_file %}', {'ssi_file': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'ssi_include.html')}, 'This is for testing an ssi include. {{ test }}\n'),
            'ssi05': ('{% load ssi from future %}{% ssi ssi_file %}', {'ssi_file': 'no_file'}, ''),

            # Test parsed output
            'ssi06': ('{%% load ssi from future %%}{%% ssi "%s" parsed %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'ssi_include.html'), {'test': 'Look ma! It parsed!'}, 'This is for testing an ssi include. Look ma! It parsed!\n'),
            'ssi07': ('{%% load ssi from future %%}{%% ssi "%s" parsed %%}' % os.path.join(os.path.dirname(os.path.abspath(__file__)), 'not_here'), {'test': 'Look ma! It parsed!'}, ''),


            ### TEMPLATETAG TAG #######################################################
            'templatetag01': ('{% templatetag openblock %}', {}, '{%'),
            'templatetag02': ('{% templatetag closeblock %}', {}, '%}'),
            'templatetag03': ('{% templatetag openvariable %}', {}, '{{'),
            'templatetag04': ('{% templatetag closevariable %}', {}, '}}'),
            'templatetag05': ('{% templatetag %}', {}, template.TemplateSyntaxError),
            'templatetag06': ('{% templatetag foo %}', {}, template.TemplateSyntaxError),
            'templatetag07': ('{% templatetag openbrace %}', {}, '{'),
            'templatetag08': ('{% templatetag closebrace %}', {}, '}'),
            'templatetag09': ('{% templatetag openbrace %}{% templatetag openbrace %}', {}, '{{'),
            'templatetag10': ('{% templatetag closebrace %}{% templatetag closebrace %}', {}, '}}'),
            'templatetag11': ('{% templatetag opencomment %}', {}, '{#'),
            'templatetag12': ('{% templatetag closecomment %}', {}, '#}'),

            ### WIDTHRATIO TAG ########################################################
            'widthratio01': ('{% widthratio a b 0 %}', {'a':50,'b':100}, '0'),
            'widthratio02': ('{% widthratio a b 100 %}', {'a':0,'b':0}, ''),
            'widthratio03': ('{% widthratio a b 100 %}', {'a':0,'b':100}, '0'),
            'widthratio04': ('{% widthratio a b 100 %}', {'a':50,'b':100}, '50'),
            'widthratio05': ('{% widthratio a b 100 %}', {'a':100,'b':100}, '100'),

            # 62.5 should round to 63
            'widthratio06': ('{% widthratio a b 100 %}', {'a':50,'b':80}, '63'),

            # 71.4 should round to 71
            'widthratio07': ('{% widthratio a b 100 %}', {'a':50,'b':70}, '71'),

            # Raise exception if we don't have 3 args, last one an integer
            'widthratio08': ('{% widthratio %}', {}, template.TemplateSyntaxError),
            'widthratio09': ('{% widthratio a b %}', {'a':50,'b':100}, template.TemplateSyntaxError),
            'widthratio10': ('{% widthratio a b 100.0 %}', {'a':50,'b':100}, '50'),

            # #10043: widthratio should allow max_width to be a variable
            'widthratio11': ('{% widthratio a b c %}', {'a':50,'b':100, 'c': 100}, '50'),

            ### WITH TAG ########################################################
            'with01': ('{% with key=dict.key %}{{ key }}{% endwith %}', {'dict': {'key': 50}}, '50'),
            'legacywith01': ('{% with dict.key as key %}{{ key }}{% endwith %}', {'dict': {'key': 50}}, '50'),

            'with02': ('{{ key }}{% with key=dict.key %}{{ key }}-{{ dict.key }}-{{ key }}{% endwith %}{{ key }}', {'dict': {'key': 50}}, ('50-50-50', 'INVALID50-50-50INVALID')),
            'legacywith02': ('{{ key }}{% with dict.key as key %}{{ key }}-{{ dict.key }}-{{ key }}{% endwith %}{{ key }}', {'dict': {'key': 50}}, ('50-50-50', 'INVALID50-50-50INVALID')),

            'with03': ('{% with a=alpha b=beta %}{{ a }}{{ b }}{% endwith %}', {'alpha': 'A', 'beta': 'B'}, 'AB'),

            'with-error01': ('{% with dict.key xx key %}{{ key }}{% endwith %}', {'dict': {'key': 50}}, template.TemplateSyntaxError),
            'with-error02': ('{% with dict.key as %}{{ key }}{% endwith %}', {'dict': {'key': 50}}, template.TemplateSyntaxError),

            ### NOW TAG ########################################################
            # Simple case
            'now01': ('{% now "j n Y"%}', {}, str(datetime.now().day) + ' ' + str(datetime.now().month) + ' ' + str(datetime.now().year)),

            # Check parsing of escaped and special characters
            'now02': ('{% now "j "n" Y"%}', {}, template.TemplateSyntaxError),
        #    'now03': ('{% now "j \"n\" Y"%}', {}, str(datetime.now().day) + '"' + str(datetime.now().month) + '"' + str(datetime.now().year)),
        #    'now04': ('{% now "j \nn\n Y"%}', {}, str(datetime.now().day) + '\n' + str(datetime.now().month) + '\n' + str(datetime.now().year))
            # Check parsing of locale strings
            'now05': ('{% now "DATE_FORMAT" %}', {},  date_format(datetime.now())),

            ### URL TAG ########################################################
            # Successes
            'legacyurl02': ('{% url regressiontests.templates.views.client_action id=client.id,action="update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'legacyurl02a': ('{% url regressiontests.templates.views.client_action client.id,"update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'legacyurl02b': ("{% url regressiontests.templates.views.client_action id=client.id,action='update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'legacyurl02c': ("{% url regressiontests.templates.views.client_action client.id,'update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'legacyurl10': ('{% url regressiontests.templates.views.client_action id=client.id,action="two words" %}', {'client': {'id': 1}}, '/url_tag/client/1/two%20words/'),
            'legacyurl13': ('{% url regressiontests.templates.views.client_action id=client.id, action=arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'legacyurl14': ('{% url regressiontests.templates.views.client_action client.id, arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'legacyurl16': ('{% url regressiontests.templates.views.client_action action="update",id="1" %}', {}, '/url_tag/client/1/update/'),
            'legacyurl16a': ("{% url regressiontests.templates.views.client_action action='update',id='1' %}", {}, '/url_tag/client/1/update/'),
            'legacyurl17': ('{% url regressiontests.templates.views.client_action client_id=client.my_id,action=action %}', {'client': {'my_id': 1}, 'action': 'update'}, '/url_tag/client/1/update/'),

            'old-url01': ('{% url regressiontests.templates.views.client client.id %}', {'client': {'id': 1}}, '/url_tag/client/1/'),
            'old-url02': ('{% url regressiontests.templates.views.client_action id=client.id action="update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'old-url02a': ('{% url regressiontests.templates.views.client_action client.id "update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'old-url02b': ("{% url regressiontests.templates.views.client_action id=client.id action='update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'old-url02c': ("{% url regressiontests.templates.views.client_action client.id 'update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'old-url03': ('{% url regressiontests.templates.views.index %}', {}, '/url_tag/'),
            'old-url04': ('{% url named.client client.id %}', {'client': {'id': 1}}, '/url_tag/named-client/1/'),
            'old-url05': (u'{% url метка_оператора v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'old-url06': (u'{% url метка_оператора_2 tag=v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'old-url07': (u'{% url regressiontests.templates.views.client2 tag=v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'old-url08': (u'{% url метка_оператора v %}', {'v': 'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'old-url09': (u'{% url метка_оператора_2 tag=v %}', {'v': 'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'old-url10': ('{% url regressiontests.templates.views.client_action id=client.id action="two words" %}', {'client': {'id': 1}}, '/url_tag/client/1/two%20words/'),
            'old-url11': ('{% url regressiontests.templates.views.client_action id=client.id action="==" %}', {'client': {'id': 1}}, '/url_tag/client/1/==/'),
            'old-url12': ('{% url regressiontests.templates.views.client_action id=client.id action="," %}', {'client': {'id': 1}}, '/url_tag/client/1/,/'),
            'old-url13': ('{% url regressiontests.templates.views.client_action id=client.id action=arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'old-url14': ('{% url regressiontests.templates.views.client_action client.id arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'old-url15': ('{% url regressiontests.templates.views.client_action 12 "test" %}', {}, '/url_tag/client/12/test/'),
            'old-url18': ('{% url regressiontests.templates.views.client "1,2" %}', {}, '/url_tag/client/1,2/'),

            # Failures
            'old-url-fail01': ('{% url %}', {}, template.TemplateSyntaxError),
            'old-url-fail02': ('{% url no_such_view %}', {}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'old-url-fail03': ('{% url regressiontests.templates.views.client %}', {}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'old-url-fail04': ('{% url view id, %}', {}, template.TemplateSyntaxError),
            'old-url-fail05': ('{% url view id= %}', {}, template.TemplateSyntaxError),
            'old-url-fail06': ('{% url view a.id=id %}', {}, template.TemplateSyntaxError),
            'old-url-fail07': ('{% url view a.id!id %}', {}, template.TemplateSyntaxError),
            'old-url-fail08': ('{% url view id="unterminatedstring %}', {}, template.TemplateSyntaxError),
            'old-url-fail09': ('{% url view id=", %}', {}, template.TemplateSyntaxError),

            # {% url ... as var %}
            'old-url-asvar01': ('{% url regressiontests.templates.views.index as url %}', {}, ''),
            'old-url-asvar02': ('{% url regressiontests.templates.views.index as url %}{{ url }}', {}, '/url_tag/'),
            'old-url-asvar03': ('{% url no_such_view as url %}{{ url }}', {}, ''),

            # forward compatibility
            # Successes
            'url01': ('{% load url from future %}{% url "regressiontests.templates.views.client" client.id %}', {'client': {'id': 1}}, '/url_tag/client/1/'),
            'url02': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" id=client.id action="update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'url02a': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" client.id "update" %}', {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'url02b': ("{% load url from future %}{% url 'regressiontests.templates.views.client_action' id=client.id action='update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'url02c': ("{% load url from future %}{% url 'regressiontests.templates.views.client_action' client.id 'update' %}", {'client': {'id': 1}}, '/url_tag/client/1/update/'),
            'url03': ('{% load url from future %}{% url "regressiontests.templates.views.index" %}', {}, '/url_tag/'),
            'url04': ('{% load url from future %}{% url "named.client" client.id %}', {'client': {'id': 1}}, '/url_tag/named-client/1/'),
            'url05': (u'{% load url from future %}{% url "метка_оператора" v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'url06': (u'{% load url from future %}{% url "метка_оператора_2" tag=v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'url07': (u'{% load url from future %}{% url "regressiontests.templates.views.client2" tag=v %}', {'v': u'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'url08': (u'{% load url from future %}{% url "метка_оператора" v %}', {'v': 'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'url09': (u'{% load url from future %}{% url "метка_оператора_2" tag=v %}', {'v': 'Ω'}, '/url_tag/%D0%AE%D0%BD%D0%B8%D0%BA%D0%BE%D0%B4/%CE%A9/'),
            'url10': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" id=client.id action="two words" %}', {'client': {'id': 1}}, '/url_tag/client/1/two%20words/'),
            'url11': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" id=client.id action="==" %}', {'client': {'id': 1}}, '/url_tag/client/1/==/'),
            'url12': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" id=client.id action="," %}', {'client': {'id': 1}}, '/url_tag/client/1/,/'),
            'url13': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" id=client.id action=arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'url14': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" client.id arg|join:"-" %}', {'client': {'id': 1}, 'arg':['a','b']}, '/url_tag/client/1/a-b/'),
            'url15': ('{% load url from future %}{% url "regressiontests.templates.views.client_action" 12 "test" %}', {}, '/url_tag/client/12/test/'),
            'url18': ('{% load url from future %}{% url "regressiontests.templates.views.client" "1,2" %}', {}, '/url_tag/client/1,2/'),

            'url19': ('{% load url from future %}{% url named_url client.id %}', {'named_url': 'regressiontests.templates.views.client', 'client': {'id': 1}}, '/url_tag/client/1/'),

            # Failures
            'url-fail01': ('{% load url from future %}{% url %}', {}, template.TemplateSyntaxError),
            'url-fail02': ('{% load url from future %}{% url "no_such_view" %}', {}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'url-fail03': ('{% load url from future %}{% url "regressiontests.templates.views.client" %}', {}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'url-fail04': ('{% load url from future %}{% url "view" id, %}', {}, template.TemplateSyntaxError),
            'url-fail05': ('{% load url from future %}{% url "view" id= %}', {}, template.TemplateSyntaxError),
            'url-fail06': ('{% load url from future %}{% url "view" a.id=id %}', {}, template.TemplateSyntaxError),
            'url-fail07': ('{% load url from future %}{% url "view" a.id!id %}', {}, template.TemplateSyntaxError),
            'url-fail08': ('{% load url from future %}{% url "view" id="unterminatedstring %}', {}, template.TemplateSyntaxError),
            'url-fail09': ('{% load url from future %}{% url "view" id=", %}', {}, template.TemplateSyntaxError),

            'url-fail11': ('{% load url from future %}{% url named_url %}', {}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'url-fail12': ('{% load url from future %}{% url named_url %}', {'named_url': 'no_such_view'}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'url-fail13': ('{% load url from future %}{% url named_url %}', {'named_url': 'regressiontests.templates.views.client'}, (urlresolvers.NoReverseMatch, urlresolvers.NoReverseMatch, template.TemplateSyntaxError)),
            'url-fail14': ('{% load url from future %}{% url named_url id, %}', {'named_url': 'view'}, template.TemplateSyntaxError),
            'url-fail15': ('{% load url from future %}{% url named_url id= %}', {'named_url': 'view'}, template.TemplateSyntaxError),
            'url-fail16': ('{% load url from future %}{% url named_url a.id=id %}', {'named_url': 'view'}, template.TemplateSyntaxError),
            'url-fail17': ('{% load url from future %}{% url named_url a.id!id %}', {'named_url': 'view'}, template.TemplateSyntaxError),
            'url-fail18': ('{% load url from future %}{% url named_url id="unterminatedstring %}', {'named_url': 'view'}, template.TemplateSyntaxError),
            'url-fail19': ('{% load url from future %}{% url named_url id=", %}', {'named_url': 'view'}, template.TemplateSyntaxError),

            # {% url ... as var %}
            'url-asvar01': ('{% load url from future %}{% url "regressiontests.templates.views.index" as url %}', {}, ''),
            'url-asvar02': ('{% load url from future %}{% url "regressiontests.templates.views.index" as url %}{{ url }}', {}, '/url_tag/'),
            'url-asvar03': ('{% load url from future %}{% url "no_such_view" as url %}{{ url }}', {}, ''),

            ### CACHE TAG ######################################################
            'cache03': ('{% load cache %}{% cache 2 test %}cache03{% endcache %}', {}, 'cache03'),
            'cache04': ('{% load cache %}{% cache 2 test %}cache04{% endcache %}', {}, 'cache03'),
            'cache05': ('{% load cache %}{% cache 2 test foo %}cache05{% endcache %}', {'foo': 1}, 'cache05'),
            'cache06': ('{% load cache %}{% cache 2 test foo %}cache06{% endcache %}', {'foo': 2}, 'cache06'),
            'cache07': ('{% load cache %}{% cache 2 test foo %}cache07{% endcache %}', {'foo': 1}, 'cache05'),

            # Allow first argument to be a variable.
            'cache08': ('{% load cache %}{% cache time test foo %}cache08{% endcache %}', {'foo': 2, 'time': 2}, 'cache06'),

            # Raise exception if we don't have at least 2 args, first one integer.
            'cache11': ('{% load cache %}{% cache %}{% endcache %}', {}, template.TemplateSyntaxError),
            'cache12': ('{% load cache %}{% cache 1 %}{% endcache %}', {}, template.TemplateSyntaxError),
            'cache13': ('{% load cache %}{% cache foo bar %}{% endcache %}', {}, template.TemplateSyntaxError),
            'cache14': ('{% load cache %}{% cache foo bar %}{% endcache %}', {'foo': 'fail'}, template.TemplateSyntaxError),
            'cache15': ('{% load cache %}{% cache foo bar %}{% endcache %}', {'foo': []}, template.TemplateSyntaxError),

            # Regression test for #7460.
            'cache16': ('{% load cache %}{% cache 1 foo bar %}{% endcache %}', {'foo': 'foo', 'bar': 'with spaces'}, ''),

            # Regression test for #11270.
            'cache17': ('{% load cache %}{% cache 10 long_cache_key poem %}Some Content{% endcache %}', {'poem': 'Oh freddled gruntbuggly/Thy micturations are to me/As plurdled gabbleblotchits/On a lurgid bee/That mordiously hath bitled out/Its earted jurtles/Into a rancid festering/Or else I shall rend thee in the gobberwarts with my blurglecruncheon/See if I dont.'}, 'Some Content'),


            ### AUTOESCAPE TAG ##############################################
            'autoescape-tag01': ("{% autoescape off %}hello{% endautoescape %}", {}, "hello"),
            'autoescape-tag02': ("{% autoescape off %}{{ first }}{% endautoescape %}", {"first": "<b>hello</b>"}, "<b>hello</b>"),
            'autoescape-tag03': ("{% autoescape on %}{{ first }}{% endautoescape %}", {"first": "<b>hello</b>"}, "&lt;b&gt;hello&lt;/b&gt;"),

            # Autoescape disabling and enabling nest in a predictable way.
            'autoescape-tag04': ("{% autoescape off %}{{ first }} {% autoescape  on%}{{ first }}{% endautoescape %}{% endautoescape %}", {"first": "<a>"}, "<a> &lt;a&gt;"),

            'autoescape-tag05': ("{% autoescape on %}{{ first }}{% endautoescape %}", {"first": "<b>first</b>"}, "&lt;b&gt;first&lt;/b&gt;"),

            # Strings (ASCII or unicode) already marked as "safe" are not
            # auto-escaped
            'autoescape-tag06': ("{{ first }}", {"first": mark_safe("<b>first</b>")}, "<b>first</b>"),
            'autoescape-tag07': ("{% autoescape on %}{{ first }}{% endautoescape %}", {"first": mark_safe(u"<b>Apple</b>")}, u"<b>Apple</b>"),

            # Literal string arguments to filters, if used in the result, are
            # safe.
            'autoescape-tag08': (r'{% autoescape on %}{{ var|default_if_none:" endquote\" hah" }}{% endautoescape %}', {"var": None}, ' endquote" hah'),

            # Objects which return safe strings as their __unicode__ method
            # won't get double-escaped.
            'autoescape-tag09': (r'{{ unsafe }}', {'unsafe': filters.UnsafeClass()}, 'you &amp; me'),
            'autoescape-tag10': (r'{{ safe }}', {'safe': filters.SafeClass()}, 'you &gt; me'),

            # The "safe" and "escape" filters cannot work due to internal
            # implementation details (fortunately, the (no)autoescape block
            # tags can be used in those cases)
            'autoescape-filtertag01': ("{{ first }}{% filter safe %}{{ first }} x<y{% endfilter %}", {"first": "<a>"}, template.TemplateSyntaxError),

            # ifqeual compares unescaped vales.
            'autoescape-ifequal01': ('{% ifequal var "this & that" %}yes{% endifequal %}', { "var": "this & that" }, "yes"),

            # Arguments to filters are 'safe' and manipulate their input unescaped.
            'autoescape-filters01': ('{{ var|cut:"&" }}', { "var": "this & that" }, "this  that" ),
            'autoescape-filters02': ('{{ var|join:" & \" }}', { "var": ("Tom", "Dick", "Harry") }, "Tom & Dick & Harry"),

            # Literal strings are safe.
            'autoescape-literals01': ('{{ "this & that" }}',{}, "this & that"),

            # Iterating over strings outputs safe characters.
            'autoescape-stringiterations01': ('{% for l in var %}{{ l }},{% endfor %}', {'var': 'K&R'}, "K,&amp;,R,"),

            # Escape requirement survives lookup.
            'autoescape-lookup01': ('{{ var.key }}', { "var": {"key": "this & that" }}, "this &amp; that"),
        */
    };

    for (var tcase in tests) {
        // if (tcase != 'basic-syntax02') continue;
        // if (tcase != 'comment-tag01') continue;
        // if (tcase != 'for-tag-unpack11') continue;

        var tdata = tests[tcase];

        Thistle.TEMPLATE_STRING_IF_INVALID = "INVALID";
        sys.puts("Running: " + tcase);

        try {
            var func = function() {
                var thistle = new Thistle(tdata[0]);
                return thistle.render(new Thistle.Context(tdata[1]));
            };

            //sys.puts(func());

            if (tdata[2] == Thistle.ParseException || tdata[2] == Thistle.TemplateSyntaxError) {
                test.throws(func, tdata[2], tcase);
            } else {
                var val = func();

                if (!(tdata[2] instanceof Array)) {
                    test.equal(tdata[2], val, tcase);
                } else {
                    var found = false;
                    for (var i = 0; i < tdata[2].length; i++) {
                        if (tdata[2][i] == val) {
                            test.equal(tdata[2][i], val, tcase);
                            found = true;
                        }
                    }
                    if (!found)
                        test.equal(tdata[2], val, tcase);
                }
            }
        } catch (e) {
            sys.puts('EXCEPTION = ' + e);
            if (e != undefined) {
                sys.puts("TYPE = " + typeof e + "Is TemplateSyntax = " + e instanceof Thistle.TemplateSyntaxError);
                sys.puts(e.name);
                sys.puts("MESSAGE: " + e.message);
            }
            sys.puts("EXCEPTION in " + tcase);
            throw e;
        }
    }

    test.done();
};

/*
exports.testFile = function(test) {
    var tmpl_data = fs.readFileSync('../input/test1.tmpl');
    var json_data = JSON.parse(fs.readFileSync('../input/test1.json'));
    var expected  = fs.readFileSync('../output/test1.html');

    var thistle = new Thistle(tmpl_data.toString());
    test.equal(thistle.render(json_data), expected.toString(), "First test");
    test.done();
};
*/

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
};

function TestObj() {
};

TestObj.prototype = {
    is_true : function() { return true; },
    is_false : function() { return false; },
    is_bad : function() { don_run_me(); },
};

//
//
//
function removeComments(text) {
    var idx;
    while ((idx = text.indexOf("/*")) != -1) {
        var eidx = text.indexOf("*/", idx);
        eidx = (eidx == -1) ? text.length : eidx + 2;

        text = text.slice(0, idx) + text.slice(eidx);
    }
    while ((idx = text.indexOf("//")) != -1) {
        var eidx = text.indexOf("\n", idx);
        eidx = (eidx == -1) ? text.length : eidx + 1;

        text = text.slice(0, idx) + text.slice(eidx);
    }
    return text;
}

//
exports.testBasic = function(test) {
    var data = fs.readFileSync("input/basic_template.json");

    var tests = JSON.parse(removeComments(""+data));

    Thistle.template_loaders = [
        function(name, dirs) {
            // return [tests[name][0], name];
            return [new Thistle.Template(tests[name][0], null, name), name];
        },
    ];

    for (var tcase in tests) {
        // if (tcase != 'include10') continue;
        // if (tcase != 'autoescape-tag08') continue;
        // if (tcase != 'if-tag-eq01') continue;

        var tdata = tests[tcase];
        var expect = tdata[2];

        Thistle.TEMPLATE_STRING_IF_INVALID = "INVALID";
        sys.puts("Running: " + tcase);

        try {
            var func = function() {
                var tmpl = new Thistle.Template(tdata[0]);
                return tmpl.render(new Thistle.Context(tdata[1]));
            };

            //sys.puts(func());

            if (expect == "Thistle.ParseException") {
                test.throws(func, Thistle.ParseException, tcase);
            } else if (expect == "Thistle.TemplateSyntaxError") {
                test.throws(func, Thistle.TemplateSyntaxError, tcase);
            } else if (expect == "Thistle.TemplateDoesNotExist") {
                test.throws(func, Thistle.TemplateDoesNotExist, tcase);
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
            if (expect == "Thistle.ParseException") {
                test.throws(func, Thistle.ParseException, tcase);
            } else if (expect == "Thistle.TemplateSyntaxError") {
                test.throws(func, Thistle.TemplateSyntaxError, tcase);
            } else if (expect == "Thistle.TemplateDoesNotExist") {
                test.throws(func, Thistle.TemplateDoesNotExist, tcase);
            } else if (expect instanceof Array) {
                for (var i = 0; i < expect.length; i++) {
                    if (expect[i] == "Thistle.TemplateDoesNotExist") {
                        // TODO - 
                    }
                }
            } else {
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

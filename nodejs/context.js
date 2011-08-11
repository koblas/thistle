var sys = require('sys');
var extend = require('./util');

function ContextPopException(message) { this.message = message; Error.apply(this, arguments); }
ContextPopException.prototype = new Error();
ContextPopException.prototype.constructor = ContextPopException;
ContextPopException.prototype.name = "Thistle.ContextPopException";

var BaseContext = function(dict) {
    this.dicts = [dict || {}]
};
extend(BaseContext, Object, {
    toString : function() {
        return "<Context with " + this.dicts.length + " frames>";
    },
    push : function () {
        d = {}
        this.dicts.push(d);
        return d;
    },
    pop : function () {
        if (this.dicts.length == 1) 
            throw new ContextPopException("pop() has been called more times than push()");
        return this.dicts.pop({});
    },
    get : function(key, defvalue) {
        for (i = this.dicts.length - 1; i >= 0; i--) {
            var d = this.dicts[i];
            if (typeof d[key] != 'undefined')
                return d[key];
        }
        return defvalue;
    },
    has_key : function(key) {
        for (var i in this.dicts) {
            var d = this.dicts[i];
            if (typeof d[key] != 'undefined')
                return true;
        }
        return false;
    },
    set : function(key, value) {
        this.dicts[this.dicts.length-1][key] = value;
    },
});

//
//
//
var RenderContext = function(dict) {
    this.dicts = [dict || {}]
};

extend(RenderContext, BaseContext, {
    has_key : function(key) {
        return self.dicts[self.dicts.length-1][key] != undefined;
    },


    get : function(key, otherwise) {
        if (self.dicts[self.dicts.length-1][key] != undefined)
            return otherwise;
        return self.dicts[self.dicts.length-1][key];
    },
});

//
//
//
var Context = function(dict, autoescape, current_app, use_l10n) {
    this.dicts = [dict || {}];
    this.autoescape = autoescape == undefined ? true : autoescape;
    this.current_app = current_app;
    this.use_l10n = use_l10n;
    this.render_context = new RenderContext();
}

extend(Context, BaseContext, {
    update : function (other_dict) {
        this.dicts.push(other_dict);
    },

    copy_new : function(values) {
        return new Context(values, this.autoescape, this.current_app, this.use_l10n);
    },
});

module.exports = Context;

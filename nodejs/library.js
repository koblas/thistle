var sys = require('sys');
var extend = require('./util');

//
//  
//
var Library = function() {
    this._tags = {}
    this._filters = {}
}

extend(Library, Object, {
    tag : function(name, tag_function) {
        this._tags[name] = tag_function;
    },
    tags : function(obj) {
        for (var key in obj) 
            this.tag(key, obj[key]);
    },

    filter : function(name, filter_func) {
        this._filters[name] = filter_func;
    },
    filters : function(obj) {
        for (var key in obj)  
            this.filter(key, obj[key]);
    },
    
    simple_tag : function(func, takes_context) {
    },
    inclusion_tag : function(file_name, context_class, takes_context) {
    }
});

module.exports = {
    Library : Library,
};

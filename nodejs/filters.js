var sys = require('sys');

var Filters = {
    'default' :function (value, arg) {
        if (value == null || value == undefined || value == false || value.length == 0) return arg;
        return value;
    },

    cut : function(value, arg) {
        return value.replace(arg, "");
    },
    join : function(value, arg) {
        sys.puts(value);
        sys.puts(arg);
        return value.join(arg);
    },
    lower : function(value) {
        return value.toLowerCase();
    },
    upper : function(value) {
        return value.toUpperCase();
    },
    default_if_none : function(value, arg) {
        if (value == null)
            return arg;
        return value;
    },
    yesno : function(value, arg) {
        if (arg == null)
            arg = 'yes,no,maybe';
        var bits = arg.split(',');

        if (bits.length < 2)
            return value;

        var yes   = bits[0];
        var no    = bits[1];
        var maybe = bits[2];

        if (value == null)
            return maybe;
        if (value)
            return yes;
        return no;
    },
    length : function(value, arg) {
        return value.length;
    },
    join : function(value, arg) {
        return value.join(arg);
    },
    truncatewords : function(value, arg) {
        var endtext = "...";

        var words = value.split(' ');
        if (words.length > arg) {
            words = words.slice(0, arg);
            if (words[words.length-1] != endtext)
                words.push(endtext);
        }
        return words.join(' ');
    }
};


Filters.join.is_safe = true;
Filters.cut.is_safe = true;

module.exports = Filters;

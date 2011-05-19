
module.exports = Filters;

var Filters = {
    'lower' : function(s) {
        return s.toLowerCase();
    },
    'upper' : function(s) {
        return s.toUpperCase();
    }
};

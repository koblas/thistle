
var kwarg_re = new RegExp('(?:(\\w+)=)?(.+)');

module.exports = function(bits, parser) {
    if (!bits || bits.length == 0)
        return {};

    var match = kwarg_re.exec(bits[0]);
    var kwarg_format = match && match[1];
    if (!kwarg_format) 
        return {};

    var kwargs = {};
    while (bits.length != 0) {
        match = kwarg_re.exec(bits[0]);
        if (!match || !match[1])
            return kwargs;
        var key   = match[1];
        var value = match[2];
        bits.shift();

        kwargs[key] = parser.compile_filter(value);
    }
    return kwargs;
};

var sys = require('util'), fs = require('fs');

var Thistle = require('./thistle');

process.argv.forEach(function (val, index, array) {
    // Skip "node" and "test.js"
    //
    if (index < 2) return;

    fs.readFile(val, function(e, data) {
        if (e) throw e;

        try {
            var thistle = new Thistle(data.toString());
            sys.puts(thistle.render({name: 'world'}));
        } catch (e) {
            sys.puts("Exception -- " + e.message);
        }
    });
});

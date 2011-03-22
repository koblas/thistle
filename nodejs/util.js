module.exports = extend;

function extend(subclass, superclass, extra) {
    var f = function() {};

    f.prototype = superclass.prototype;
    subclass.prototype = new f();
    subclass.prototype.constructor = subclass;
    subclass.superclass = superclass;
    if (superclass.prototype.constructor == Object.prototype.constructor) 
        superclass.prototype.constructor = superclass;

    extra = extra || {};
    for (var k in extra) {
        subclass.prototype[k] = extra[k];
    }
};

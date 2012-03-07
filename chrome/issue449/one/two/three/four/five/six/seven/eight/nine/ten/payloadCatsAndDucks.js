// default first line used
//@ sourceURL=res:/FireclipseTests/WebContent/payloadCatsAndDucks.js
function prod( animal) {
//
//
//
//
// line 8
    animal.say();
};

var duck = function() {
    this.say = function() { // line 13 rel to this file; 22 + 13 = 35
        dump('quack\n');   // line 14 rel to this file 22+14=36
    };
};

var cat = function() {
    this.say = function() {
        dump('meow!!\n');
    };
};

// vvv
//
//
//@ sourceURL=res:/FireclipseTests/WebContent/payloadCatsAndDucks.js


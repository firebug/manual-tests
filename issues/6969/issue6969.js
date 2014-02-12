function dynamic_inject(){
    var src = "console.log(10); //@ sourceURL=foo.js";
    (new Function(src))();
}
dynamic_inject();
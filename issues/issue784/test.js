function test() {
    if ( window.top == window ) {
        document.getElementById("output").innerHTML =
            "<p>top window</p><iframe src='test2.html'></iframe>";
    } else {
        document.getElementById("output").innerHTML = "inner window";
    }
}
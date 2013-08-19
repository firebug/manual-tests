/* See license.txt for terms of usage */

var TestCase = (function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

// ********************************************************************************************* //
// Initialization

var TestCase =
{
    initialize: function()
    {
        sysout("initialize");
    },

    shutdown: function()
    {
        sysout("shutdown");
    },

    toggle: function()
    {
        var mainFrame = document.getElementById("testMainFrame");
        var attr = mainFrame.getAttribute("collapsed");
        if (attr == "true")
            mainFrame.removeAttribute("collapsed");
        else
            mainFrame.setAttribute("collapsed", "true");
    }
};

// ********************************************************************************************* //
// Logging

var FBTrace;
function sysout(msg)
{
    if (!FBTrace)
    {
        Components.utils.import("resource://firebug/firebug-trace-service.js");
        FBTrace = traceConsoleService.getTracer("extensions.firebug");
    }

    dump(msg + "\n");
    FBTrace.sysout(msg);
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { TestCase.initialize(); }, false);
window.addEventListener("unload", function() { TestCase.shutdown(); }, false);

return TestCase;

// ********************************************************************************************* //
})();

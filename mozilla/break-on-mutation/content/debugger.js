/* See license.txt for terms of usage */

var SimpleDebugger = (function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;

var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);

// ********************************************************************************************* //
// Initialization

var SimpleDebugger =
{
    initialize: function()
    {
        sysout("initialize");

        if (jsd.isOn)
            return;

        if (jsd.asyncOn)
        {
            jsd.asyncOn(this);
        }
        else
        {
            jsd.on();
            this.onDebuggerActivated();
        }
    },

    shutdown: function()
    {
        if (jsd.isOn)
            jsd.off();

        this.unhookScripts();

        sysout("debugger deactivated: " + jsd.isOn);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    onDebuggerActivated: function()
    {
        this.hookScripts();
        sysout("debugger activated: " + jsd.isOn);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hookScripts: function()
    {
        jsd.debuggerHook = { onExecute: hook(this, this.onDebugger) };
        jsd.debugHook = null;
        jsd.errorHook = null;
    },

    unhookScripts: function()
    {
        jsd.debuggerHook = null;
        jsd.debugHook = null;
        jsd.errorHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Hooks

    isPageURL: function(url)
    {
        return (url && url.indexOf("http") == 0);
    },

    onDebugger: function(frame, type, rv)
    {
        sysout("onDebugger: " + frame.script.fileName);
        sysout("onDebugger stack: " + framesToString(frame));

        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Mutation Observer

    hookAttrMutation: function()
    {
        var doc = gBrowser.selectedBrowser.contentDocument
        doc.addEventListener("DOMAttrModified", this.onMutateAttr, false);

        sysout("hookAttrMutation;");
    },

    onMutateAttr: function(event)
    {
        var view = event.target.ownerDocument.defaultView;
        sysout("onMutateAttr; " + getComponentsStack());
        debugger;
    }
};

// ********************************************************************************************* //
// Logging

var FBTrace;
function sysout(msg, obj)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");

    if (typeof(FBTrace) != "undefined")
    {
        try
        {
            Cu["import"]("resource://fbtrace/firebug-trace-service.js");
            FBTrace = traceConsoleService.getTracer("extensions.firebug");
        }
        catch (err)
        {
        }
    }

    if (typeof(FBTrace) != "undefined")
        FBTrace.sysout(msg, obj);
}

function hook(obj, fn)
{
    return function()
    {
        try
        {
            return fn.apply(obj, arguments);
        }
        catch (exc)
        {
            SimpleDebugger.unhookScripts();
            sysout("Error in hook: " + exc + ", fn=" + fn);
            return Ci.jsdIExecutionHook.RETURN_CONTINUE;
        }
    }
}

// ********************************************************************************************* //
// Helpers

function framesToString(frame)
{
    var str = "";
    while (frame)
    {
        str += frameToString(frame) + "\n";
        frame = frame.callingFrame;
    }

    return str;
}

function frameToString(frame)
{
    if (!frame)
        return "<no frame>";

    if (!frame.script)
        return "<bad frame>";

    return frame.script.fileName+"@"+frame.line;
}

function getComponentsStack()
{
    var msg = [];
    for (var frame = Components.stack; frame; frame = frame.caller)
        msg.push(frame.filename + "@" + frame.lineNumber);
    return msg.join("\n");
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { SimpleDebugger.initialize(); }, false);
window.addEventListener("unload", function() { SimpleDebugger.shutdown(); }, false);

return SimpleDebugger;

// ********************************************************************************************* //
})();

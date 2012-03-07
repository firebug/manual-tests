/* See license.txt for terms of usage */

(function() {

// ************************************************************************************************
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);

// ************************************************************************************************
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

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onDebuggerActivated: function()
    {
        this.hookScripts();
        sysout("debugger activated: " + jsd.isOn);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    hookScripts: function()
    {
        jsd.debugHook = { onExecute: hook(this, this.onDebug) };
        jsd.errorHook = this;
    },

    unhookScripts: function()
    {
        jsd.debugHook = null;
        jsd.errorHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Hooks

    isPageURL: function(url)
    {
        return (url && url.indexOf("http") == 0);
    },

    onError: function(message, fileName, lineNo, colNo, flags, errnum, exc)
    {
        sysout("onError: " + message);
        return false;
    },

    onDebug: function(frame, type, rv)
    {
        sysout("onDebug: " + frame.script.fileName);
        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
    },
};

// ************************************************************************************************
// Logging

var FBTrace;
function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");

    if (!FBTrace)
    {
        Components.utils["import"]("resource://fbtrace/firebug-trace-service.js");
        FBTrace = traceConsoleService.getTracer("extensions.firebug");
    }
    FBTrace.sysout(msg);
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

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { SimpleDebugger.initialize(); }, false);
window.addEventListener("unload", function() { SimpleDebugger.shutdown(); }, false);

// ************************************************************************************************
})();

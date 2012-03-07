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
        sysout("simpleDebugger initialize complete");
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
        jsd.scriptHook = this;
        jsd.errorHook = this;
        jsd.breakpointHook = { onExecute: hook(this, this.onBreakpoint) };
        //jsd.interruptHook = { onExecute: hook(this, this.onInterrupt) };
    },

    unhookScripts: function()
    {
        jsd.scriptHook = null;
        jsd.errorHook = null;
        jsd.breakpointHook = null;
        jsd.interruptHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Hooks

    isPageURL: function(url)
    {
        return (url && url.indexOf("http") == 0);
    },

    onScriptCreated: function(script)
    {
        if (script.lineExtent > 80000)
            sysout("****************>> BOGUS line extent ("+script.lineExtent+") for "+script.fileName);
    },

    onScriptDestroyed: function(script)
    {
        if (!this.isPageURL(script.fileName))
            return;

        //sysout("onScriptDestroyed " + script.fileName + ", " + script.functionName + ", " +
        //    script.baseLineNumber);
    },

    onError: function(message, fileName, lineNo, colNo, flags, errnum, exc)
    {
        //sysout("onError: " + message + ", " + fileName + ", " + lineNo);
    },

    onInterrupt: function(frame, type, rv)
    {
        rv = Ci.jsdIExecutionHook.RETURN_CONTINUE;

        if (!this.isPageURL(frame.script.fileName))
            return rv;

        var lineId = frame.script.fileName + frame.line;
        if (lineId != this.prevLineId)
            sysout("onInterrupt; Line: " + frame.line);

        this.prevLineId = lineId;

        return rv;
    },

    onBreakpoint: function(frame, type, rv)
    {
        //sysout("onBreakpoint; " + frame.script.fileName + ", " + frame.line);
        frame.script.clearBreakpoint(0);
        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
    }
};

// ************************************************************************************************
// Logging

function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");
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
Components.utils.reportError("simpleDebugger top level complete");
sysout("simpleDebugger top level complete");
// ************************************************************************************************
})();

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
        jsd.breakpointHook = SimpleDebugger.BreakpointHook;
    },

    unhookScripts: function()
    {
        jsd.scriptHook = null;
        jsd.breakpointHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Hooks

    isPageURL: function(url)
    {
        return (url && url.indexOf("http://") == 0);
    },

    onScriptCreated: function(script)
    {
        if (!this.isPageURL(script.fileName))
            return;

        script.setBreakpoint(0);

        //sysout("onScriptCreated " + script.fileName + ", " + script.functionName + ", " +
        //    script.baseLineNumber);
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
        sysout("onError: " + message + ", " + fileName + ", " + lineNo);
    },
};

// ************************************************************************************************

SimpleDebugger.BreakpointHook =
{
    onExecute: function(frame, type, rv)
    {
        //sysout("onBreakpoint " + frame.script.fileName + ", " + frame.line);
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

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { SimpleDebugger.initialize(); }, false);
window.addEventListener("unload", function() { SimpleDebugger.shutdown(); }, false);

// ************************************************************************************************
})();

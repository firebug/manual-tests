/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);

// ********************************************************************************************* //
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

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    onDebuggerActivated: function()
    {
        this.hookScripts();
        sysout("debugger activated: " + jsd.isOn);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hookScripts: function()
    {
        jsd.scriptHook = this;
        jsd.errorHook = this;
        jsd.breakpointHook = { onExecute: hook(this, this.onBreakpoint) };
        jsd.interruptHook = { onExecute: hook(this, this.onInterrupt) };
        jsd.debuggerHook = { onExecute: hook(this, this.onDebugger) };
    },

    unhookScripts: function()
    {
        jsd.scriptHook = null;
        jsd.errorHook = null;
        jsd.breakpointHook = null;
        jsd.interruptHook = null;
        jsd.debuggerHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Hooks

    isPageURL: function(url)
    {
        if (!url)
            return false;

        return (url.indexOf("http") == 0 || url.indexOf("file") == 0);
    },

    onScriptCreated: function(script)
    {
    },

    onScriptDestroyed: function(script)
    {
    },

    onError: function(message, fileName, lineNo, colNo, flags, errnum, exc)
    {
    },

    onInterrupt: function(frame, type, rv)
    {
        rv = Ci.jsdIExecutionHook.RETURN_CONTINUE;

        if (!this.isPageURL(frame.script.fileName))
            return rv;

        return rv;
    },

    onBreakpoint: function(frame, type, rv)
    {
        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
    },

    onDebugger: function(frame, type, rv)
    {
        sysout("scope: " + frame.scope.jsClassName);

        var scopeVars = this.getProperties(frame.scope);
        sysout("scope vars: " + scopeVars.join(", "));

        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Hooks

    getProperties: function(scope)
    {
        var scopeVars = [];
        var listValue = {value: null}, lengthValue = {value: 0};
        scope.getProperties(listValue, lengthValue);

        for (var i=0; i<lengthValue.value; ++i)
        {
            var prop = listValue.value[i];
            var name = this.unwrapIValue(prop.name);
            var value = this.unwrapIValue(prop.value);
            scopeVars.push(name + ": " + value);
        }
        return scopeVars;
    },

    unwrapIValue: function(object)
    {
        var unwrapped = object.getWrappedValue();
        //return unwrapped;

        if (typeof(XPCSafeJSObjectWrapper) != "undefined")
            return XPCSafeJSObjectWrapper(unwrapped);
        else if (typeof(unwrapped) == "object")
            return XPCNativeWrapper.unwrap(unwrapped);
        else
            return unwrapped;
    }
};

// ********************************************************************************************* //
// Helpers

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
// Logging

function sysout(msg, obj)
{
    Components.utils.reportError(msg);
    dump(msg + (obj ? ", " + obj : "") + "\n");

    if (typeof(FBTrace) != "undefined")
        FBTrace.sysout(msg, obj);
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { SimpleDebugger.initialize(); }, false);
window.addEventListener("unload", function() { SimpleDebugger.shutdown(); }, false);

// ********************************************************************************************* //
})();

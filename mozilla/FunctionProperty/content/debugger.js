/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);

// ********************************************************************************************* //
// Initialization

var FunctionProperty =
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

    onTest: function()
    {
        var self = this;
        jsd.enumerateScripts(
        {
            enumerateScript: function(script)
            {
                if (!script)
                    return;

                if (!script.fileName || script.fileName.indexOf("test.html") < 0)
                    return;

                var func = script.functionObject;
                var props = self.getProperties(func);
                sysout(props.join(", "));
            }
        });
    },

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
        return unwrapped;

        if (typeof(XPCSafeJSObjectWrapper) != "undefined")
            return XPCSafeJSObjectWrapper(unwrapped);
        else if (typeof(unwrapped) == "object")
            return XPCNativeWrapper.unwrap(unwrapped);
        else
            return unwrapped;
    }
};

// ********************************************************************************************* //
// Logging

function sysout(msg, obj)
{
    Components.utils.reportError(msg);
    dump(msg + ", " + obj + "\n");

    if (typeof(FBTrace) != "undefined")
        FBTrace.sysout(msg, obj);
}

// ********************************************************************************************* //
// Registration

window.FunctionProperty = FunctionProperty;

window.addEventListener("load", function() { FunctionProperty.initialize(); }, false);
window.addEventListener("unload", function() { FunctionProperty.shutdown(); }, false);

// ********************************************************************************************* //
})();

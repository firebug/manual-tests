/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
var utils = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

// ********************************************************************************************* //
// Initialization

var Extension =
{
    initialize: function()
    {
        consoleService.registerListener(this);

        sysout("Test Extension Initialized");
    },

    shutdown: function()
    {
        sysout("Test Extension Shutdown");

        consoleService.unregisterListener(this);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Console Service Listener

    observe: function(object)
    {
        if (!(object instanceof Ci.nsIScriptError) &&
            !(object instanceof Ci.nsIScriptError2))
        {
            sysout("not an error object!");
            return;
        }

        if (!object.outerWindowID)
        {
            sysout("no outerWindowID!");
            return;
        }

        var win = utils.getOuterWindowWithId(object.outerWindowID);
        sysout("error msg " + object.message);
        sysout("error win " + object.outerWindowID + ", " +
            (win ? win.location.href : "no window"));
    }
};

// ********************************************************************************************* //
// Logging

function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { Extension.initialize(); }, false);
window.addEventListener("unload", function() { Extension.shutdown(); }, false);

// ********************************************************************************************* //
})();

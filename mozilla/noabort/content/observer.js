/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// ********************************************************************************************* //
// Initialization

var SimpleObserver =
{
    initialize: function()
    {
        observerService.addObserver(this, "http-on-modify-request", false);
        sysout("observer activated");
    },

    shutdown: function()
    {
        observerService.removeObserver(this, "http-on-modify-request", false);
        sysout("observer deactivated");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    observe: function(subject, topic, data)
    {
        if (topic == "http-on-modify-request")
        {
            sysout("--- observe: " + safeGetName(subject));
        }
    }
};

function safeGetName(request)
{
    try
    {
        if (request instanceof Ci.nsIHttpChannel)
            return request.name;
    }
    catch (exc)
    {
    }

    return null;
}

// ********************************************************************************************* //
// Logging

function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { SimpleObserver.initialize(); }, false);
window.addEventListener("unload", function() { SimpleObserver.shutdown(); }, false);

// ********************************************************************************************* //
})();

/* See license.txt for terms of usage */

(function() {
// ********************************************************************************************* //
// Extension life cycle, this is where it all begin

const Cc = Components.classes;
const Ci = Components.interfaces;

var HttpMonitor =
{
    initialize: function()
    {
        window.removeEventListener("load", HttpMonitor.initialize, false);

        HttpRequestObserver.register();
    },

    shutdown: function()
    {
        HttpRequestObserver.unregister();

        window.removeEventListener("unload", HttpMonitor.shutdown, false);
    }
};

// Register handlers to maintain extension life cycle.
window.addEventListener("load", HttpMonitor.initialize, false);
window.addEventListener("unload", HttpMonitor.shutdown, false);

// ********************************************************************************************* //
// HTTP Observer

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

var HttpRequestObserver =
{
    register: function()
    {
        observerService.addObserver(this, "http-on-examine-cached-response", false);
    },

    unregister: function()
    {
        observerService.removeObserver(this, "http-on-examine-cached-response");
    },

    /* nsIObserve */
    observe: function(request, topic, data)
    {
        if (request instanceof Ci.nsIHttpChannel)
        {
            dump("httpMonitor: " + safeGetRequestName(request) + ", " + topic + "\n");
        }
    }
}

function safeGetRequestName(request)
{
    try
    {
        return request.name;
    }
    catch (exc)
    {
        return null;
    }
}

// ********************************************************************************************* //
})();

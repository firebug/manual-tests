/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var eventListenerService = Cc["@mozilla.org/eventlistenerservice;1"].getService(Ci.nsIEventListenerService);

// ********************************************************************************************* //
// HTTP Observer

var HttpObserver =
{
    initialize: function()
    {
        observerService.addObserver(this, "http-on-modify-request", false);
        observerService.addObserver(this, "http-on-opening-request", false);

        sysout("observer activated");
    },

    shutdown: function()
    {
        observerService.removeObserver(this, "http-on-modify-request", false);
        observerService.removeObserver(this, "http-on-opening-request", false);

        sysout("observer deactivated");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    observe: function(subject, topic, data)
    {
        var xhr = getXHR(subject);
        if (!xhr)
            return;

        sysout("--- observe: " + topic + ", " + safeGetName(subject));

        if (topic == "http-on-modify-request")
        {
            // XhrObserver.attach(xhr); // too late since asynchronous
        }
        else if (topic == "http-on-opening-request")
        {
            XhrObserver.attach(xhr);
        }
    }
};

// ********************************************************************************************* //
// XHR Observer

var XhrObserver =
{
    attach: function(xhr)
    {
        this.onReadyStateChange = function(event) {
            sysout("onReadyStateChange " + event.type + ", " + event.target.readyState);
        };

        this.onLoad = function() {
            sysout("onLoad " + event.type + ", " + event.target.readyState);
        };

        this.onError = function() {
            sysout("onError " + event.type + ", " + event.target.readyState);
        };

        this.onAbort = function() {
            sysout("onAbort " + event.type + ", " + event.target.readyState);
        };

        this.onEventListener = function(event) {
            sysout("onEventListener " + event.type + ", " + event.target.readyState);
        };

        eventListenerService.addListenerForAllEvents(xhr,
            this.onEventListener, true, false, false);

        xhr.addEventListener("load", this.onLoad, false);
        xhr.addEventListener("error", this.onError, false);
        xhr.addEventListener("abort", this.onAbort, false);
    },
};

// ********************************************************************************************* //
// Helpers

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

function getXHR(request)
{
    if (!(request instanceof Ci.nsIHttpChannel))
        return null;

    try
    {
        var callbacks = request.notificationCallbacks;
        if (callbacks)
            return callbacks.getInterface(Ci.nsIXMLHttpRequest);
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
    Cu.reportError(msg);
    dump(msg + "\n");
}

// ********************************************************************************************* //
// Registration

window.addEventListener("load", function() { HttpObserver.initialize(); }, false);
window.addEventListener("unload", function() { HttpObserver.shutdown(); }, false);

// ********************************************************************************************* //
})();

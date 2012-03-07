/* See license.txt for terms of usage */

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;

// ********************************************************************************************* //
// Firefox Bootstrap API

var observer;
function startup(aData, aReason)
{
    observer = new ActivityObserver(function(eventId, request)
    {
        if (eventId == "waitingFor")
        {
            safeGetRemoteAddress(eventId, request);
        }
        else if (eventId == "responseComplete")
        {
            //var remoteAddress = safeGetRemoteAddress(eventId, request);
            //Components.utils.reportError(remoteAddress + " " + safeGetRequestName(request));
        }
    });

    observer.register();
}

function shutdown(aData, aReason)
{
    if (observer)
        observer.unregister();
}

function install(aData, aReason)
{
}

function uninstall(aData, aReason)
{
}

// ********************************************************************************************* //
// IP Adress

function safeGetRemoteAddress(eventId, request)
{
    try
    {
        if (request instanceof Ci.nsIHttpChannelInternal)
            return request.remoteAddress;
    }
    catch (err)
    {
        Components.utils.reportError(eventId + ": " + err);
    }
    return null;
}

function safeGetRequestName(request)
{
    try
    {
        return request.name;
    }
    catch (exc)
    {
    }
    return null;
}

// ********************************************************************************************* //
// Activity Observer Implementation

var nsIHttpActivityObserver = Ci.nsIHttpActivityObserver;
var nsISocketTransport = Ci.nsISocketTransport;

// ********************************************************************************************* //
// Activity Observer

function ActivityObserver(callback)
{
    this.callback = callback;
}

ActivityObserver.prototype =
{
    registered: false,

    register: function()
    {
        if (!Ci.nsIHttpActivityDistributor)
            return;

        if (this.registered)
            return;

        var distributor = this.getActivityDistributor();
        if (!distributor)
            return;

        distributor.addObserver(this);
        this.registered = true;
    },

    unregister: function()
    {
        if (!Ci.nsIHttpActivityDistributor)
            return;

        if (!this.registered)
            return;

        var distributor = this.getActivityDistributor();
        if (!distributor)
            return;

        distributor.removeObserver(this);
        this.registered = false;
    },

    getActivityDistributor: function()
    {
        if (!this.activityDistributor)
        {
            try
            {
                var hadClass = Cc["@mozilla.org/network/http-activity-distributor;1"];
                if (!hadClass)
                    return null;

                this.activityDistributor = hadClass.getService(Ci.nsIHttpActivityDistributor);
            }
            catch (err)
            {
            }
        }
        return this.activityDistributor;
    },

    /* nsIActivityObserver */
    observeActivity: function(httpChannel, activityType, activitySubtype, timestamp,
        extraSizeData, extraStringData)
    {

        try
        {
            if (httpChannel instanceof Ci.nsIHttpChannel)
                this.observeRequest(httpChannel, activityType, activitySubtype, timestamp,
                    extraSizeData, extraStringData);
        }
        catch (exc)
        {
            Components.utils.reportError(exc);
        }
    },

    observeRequest: function(httpChannel, activityType, activitySubtype, timestamp,
        extraSizeData, extraStringData)
    {
        var time = new Date();
        time.setTime(timestamp/1000);
        time = time.getTime();

        if (activityType == nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION)
        {
            if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_HEADER)
            {
                this.post("requestHeader", [httpChannel, time, extraStringData]);
            }
            else if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE)
            {
                this.post("transactionClose", [httpChannel, time]);
            }
            else if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_HEADER)
            {
                this.post("responseHeader", [httpChannel, time, extraStringData]);
            }
            else if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT)
            {
                this.post("bodySent", [httpChannel, time]);
            }
            else if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_START)
            {
                this.post("responseStart", [httpChannel, time]);
            }
            else if (activitySubtype == nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE)
            {
                this.post("responseComplete", [httpChannel, time, extraSizeData]);
            }
        }
        else if (activityType == nsIHttpActivityObserver.ACTIVITY_TYPE_SOCKET_TRANSPORT)
        {
            if (activitySubtype == nsISocketTransport.STATUS_RESOLVING)
            {
                this.post("resolving", [httpChannel, time]);
            }
            else if (activitySubtype == nsISocketTransport.STATUS_CONNECTING_TO)
            {
                this.post("connectingTo", [httpChannel, time]);
            }
            else if (activitySubtype == nsISocketTransport.STATUS_CONNECTED_TO)
            {
                this.post("connectedTo", [httpChannel, time]);
            }
            else if (activitySubtype == nsISocketTransport.STATUS_SENDING_TO)
            {
                this.post("sendingTo", [httpChannel, time, extraSizeData]);
            }
            else if (activitySubtype == nsISocketTransport.STATUS_WAITING_FOR)
            {
                this.post("waitingFor", [httpChannel, time]);
            }
            else if (activitySubtype == nsISocketTransport.STATUS_RECEIVING_FROM)
            {
                this.post("receivingFrom", [httpChannel, time, extraSizeData]);
            }
        }
    },

    post: function(eventId, args)
    {
        this.callback(eventId, args[0]);
    },

    /* nsISupports */
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIActivityObserver)) {
            return this;
         }

        throw Cr.NS_ERROR_NO_INTERFACE;
    }
}

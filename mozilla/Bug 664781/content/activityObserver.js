// ************************************************************************************************
// Initialization

dump("Activity observer extension loaded\n");

var activityObserver = 
{
    onLoad: function() 
    {
        var distributor = Components.classes[
            "@mozilla.org/network/http-activity-distributor;1"]
            .getService(Components.interfaces.nsIHttpActivityDistributor);
        distributor.addObserver(httpObserver);

        dump("Activity observer registered\n");
    }
};

window.addEventListener("load", function(e) { activityObserver.onLoad(e); }, false);

// ************************************************************************************************
// HTTP Activity Observer

var httpObserver =
{
    /* nsIActivityObserver */
    observeActivity: function(httpChannel, activityType, activitySubtype, timestamp,
        extraSizeData, extraStringData)
    {
        try
        {
            var request = httpChannel;
            if (!(request instanceof Components.interfaces.nsIHttpChannel))
                return;

            var url = safeGetName(request);
            var filter = "http://getfirebug.com/tests/console/joes-original/test.html?";
            if (!url || url.indexOf(filter) != 0)
                return;

            var time = new Date();
            time.setTime(timestamp);
            dump("activityObserver; " +
                url + ", " +
                acType(activityType) + ", " + 
                acSubType(activitySubtype) + ", '" +
                time.toGMTString() + "\n\n");
        }
        catch (exc)
        {
            dump("activityObserver: EXCEPTION " + exc + "\n");
        }
    },
};

// ************************************************************************************************
// Helpers

function getWindowForRequest(request)
{
    var webProgress = getRequestWebProgress(request);
    try {
        if (webProgress)
            return webProgress.DOMWindow;
    }
    catch (ex) {
    }

    return null;
}

function getRequestWebProgress(request)
{
    try
    {
        if (request && request.notificationCallbacks)
            return request.notificationCallbacks.getInterface(Components.interfaces.nsIWebProgress);
    } catch (exc) {}

    try
    {
        if (request && request.loadGroup && request.loadGroup.groupObserver)
            return request.loadGroup.groupObserver.QueryInterface(Components.interfaces.nsIWebProgress);
    } catch (exc) {}

    return null;
}

function safeGetName(request)
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

const nsIHttpActivityObserver = Components.interfaces.nsIHttpActivityObserver;
const nsISocketTransport = Components.interfaces.nsISocketTransport;

function acType(a)
{
  switch (a)
  {
    case nsIHttpActivityObserver.ACTIVITY_TYPE_SOCKET_TRANSPORT:
        return "ACTIVITY_TYPE_SOCKET_TRANSPORT";
    case nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION:
        return "ACTIVITY_TYPE_HTTP_TRANSACTION";
    default:
        return a;
  }
}

function acSubType(a)
{
    switch (a)
    {
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_HEADER:
      return "ACTIVITY_SUBTYPE_REQUEST_HEADER";
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT:
      return "ACTIVITY_SUBTYPE_REQUEST_BODY_SENT";
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_START:
      return "ACTIVITY_SUBTYPE_RESPONSE_START";
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_HEADER:
      return "ACTIVITY_SUBTYPE_RESPONSE_HEADER";
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE:
      return "ACTIVITY_SUBTYPE_RESPONSE_COMPLETE";
    case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE:
      return "ACTIVITY_SUBTYPE_TRANSACTION_CLOSE";

    case nsISocketTransport.STATUS_RESOLVING:
      return "STATUS_RESOLVING";
    case nsISocketTransport.STATUS_CONNECTING_TO:
      return "STATUS_CONNECTING_TO";
    case nsISocketTransport.STATUS_CONNECTED_TO:
      return "STATUS_CONNECTED_TO";
    case nsISocketTransport.STATUS_SENDING_TO:
      return "STATUS_SENDING_TO";
    case nsISocketTransport.STATUS_WAITING_FOR:
      return "STATUS_WAITING_FOR";
    case nsISocketTransport.STATUS_RECEIVING_FROM:
      return "STATUS_RECEIVING_FROM";

    default:
      return a;
    }
}

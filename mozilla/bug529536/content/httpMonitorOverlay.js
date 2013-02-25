/* See license.txt for terms of usage */

(function() {
// ********************************************************************************************* //
// Extension life cycle, this is where it all begin

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var HttpMonitor =
{
    initialize: function()
    {
        HttpRequestObserver.register();
    },

    shutdown: function()
    {
        HttpRequestObserver.unregister();

        window.removeEventListener("load", HttpMonitor.initialize, false);
        window.removeEventListener("unload", HttpMonitor.shutdown, false);
    }
};

// Register handlers to maintain extension life cycle.
window.addEventListener("load", HttpMonitor.initialize, false);
window.addEventListener("unload", HttpMonitor.shutdown, false);

// ********************************************************************************************* //
// HTTP Observer, based on nsIObserver, handling http-on-examine-response and
// http-on-examine-cached-response events in order to register a channel listener.

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

var HttpRequestObserver =
{
    register: function()
    {
        observerService.addObserver(this, "http-on-examine-response", false);
        observerService.addObserver(this, "http-on-examine-cached-response", false);
    },

    unregister: function()
    {
        observerService.removeObserver(this, "http-on-examine-response");
        observerService.removeObserver(this, "http-on-examine-cached-response");
    },

    /* nsIObserve */
    observe: function(request, topic, data)
    {
        if (request instanceof Ci.nsIHttpChannel)
        {
            if (topic == "http-on-examine-response" || topic == "http-on-examine-cached-response")
            {
                try
                {
                    sysout("registerStreamListener:" + safeGetRequestName(request));

                    // Create tee listener and set it to the request.
                    var tee = Cc["@mozilla.org/network/stream-listener-tee;1"].
                        createInstance(Ci.nsIStreamListenerTee);
                    tee = tee.QueryInterface(Ci.nsIStreamListenerTee);

                    request.QueryInterface(Ci.nsITraceableChannel);
                    var originalListener = request.setNewListener(tee);

                    // Create stream listener to watch HTTP responses.
                    var myListener = new ChannelListener();
                    var outputStream = myListener.sink.outputStream;
                    tee.init(originalListener, outputStream, myListener);
                }
                catch (err)
                {
                    sysout("HttpRequestObserver: Register Traceable Listener EXCEPTION", err);
                }
            }
        }
    }
}

// ********************************************************************************************* //
// Channel Listener, this is the object reponsible for reading the input stream
// (i.e. response body coming from the server)

function ChannelListener()
{
    // Initialized in onStartRequest
    this.request = null;

    // The response will be written into the outputStream of this pipe.
    this.sink = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
    this.sink.init(false, false, 0x20000, 0x4000, null);

    // Create reference to avoid GC removal.
    this.inputStream = this.sink.inputStream;
}

ChannelListener.prototype =
{
    // nsIObserver
    onStartRequest: function(request, requestContext)
    {
        try
        {
            this.request = request.QueryInterface(Ci.nsIHttpChannel);
            this.setAsyncListener(request, this.sink.inputStream, this);
        }
        catch (err)
        {
            sysout("ChannelListener.onStartRequest EXCEPTION\n", err);
        }
    },

    onStopRequest: function(request, requestContext, statusCode)
    {
        this.sink.inputStream.asyncWait(null, 0, 0, null);

        HttpResponseCache.onResponseComplete(request);

        if (this.listener)
            this.listener.onStopRequest(request, requestContext, statusCode);
    },

    setAsyncListener: function(request, stream, listener)
    {
        try
        {
            // xxxHonza: is there any other way how to find out the stream is closed?
            // Throws NS_BASE_STREAM_CLOSED if the stream is closed normally or at end-of-file.
            var available = stream.available();
        }
        catch (err)
        {
            sysout("ChannelListener.setAsyncListener; EXCEPTION " + safeGetRequestName(request), err);
            return;
        }

        try
        {
            // Asynchronously wait for the stream to be readable or closed.
            stream.asyncWait(listener, 0, 0, null);
        }
        catch (err)
        {
            sysout("ChannelListener.setAsyncListener; EXCEPTION " + safeGetRequestName(request), err);
        }
    },

    // nsIInputStreamCallback
    onInputStreamReady : function(stream)
    {
        try
        {
            if (stream instanceof Ci.nsIAsyncInputStream)
            {
                try
                {
                    var available = stream.available();
                    this.onCollectData(this.request, null, stream, 0, available);
                }
                catch (err)
                {
                    // stream.available throws an exception if the stream is closed,
                    // which is ok, since this callback can be called even in this
                    // situations.
                    sysout("ChannelListener.onInputStreamReady EXCEPTION calling onDataAvailable: " +
                        safeGetRequestName(this.request), err);
                }

                // Listen for further incoming data.
                this.setAsyncListener(this.request, stream, this);
            }
            else
            {
                sysout("ChannelListener.onInputStreamReady NOT a nsIAsyncInputStream", stream);
            }
        }
        catch (err)
        {
            sysout("ChannelListener.onInputStreamReady EXCEPTION " +
                safeGetRequestName(this.request), err);
        }
    },

    onCollectData: function(request, context, inputStream, offset, count)
    {
        try
        {
            var bis = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
            bis.setInputStream(inputStream);
            var data = bis.readBytes(count);

            // Store received data into the cache as they come.
            HttpResponseCache.storePartialResponse(request, data);
        }
        catch (err)
        {
            sysout("ChannelListener.onCollectData EXCEPTION", err);
        }

        return null;
    }
}

// ********************************************************************************************* //
// Cache, this object represents a simple cache counting amount of received data.

var HttpResponseCache =
{
    cache: {},

    storePartialResponse: function(request, data)
    {
        var url = safeGetRequestName(request);

        if (!this.cache[url])
            this.cache[url] = data.length;
        else
            this.cache[url] += data.length;

        sysout(formatSize(this.cache[url]));
    },

    onResponseComplete: function(request)
    {
        var url = safeGetRequestName(request);

        sysout("Response complete: (" + formatSize(this.cache[url]) + ") " + url);

        delete this.cache[url];
    }
}

// ********************************************************************************************* //
// Helpers

function sysout(message, obj)
{
    if (obj)
        message += " " + obj;

    dump(message + "\n");

    try
    {
        // Dump into Firebug tracing console (if available)
        var scope = {};
        Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
        var FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");
        FBTrace.sysout(message, obj);
    }
    catch (e)
    {
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

function formatSize(bytes)
{
    var a = Math.pow(10, 2);

    if (bytes == -1 || bytes == undefined)
        return "?";
    else if (bytes == 0)
        return "0";
    else if (bytes < 1024)
        return bytes + " B";
    else if (bytes < (1024*1024))
        return Math.round((bytes/1024)*a)/a + " KB";
    else
        return Math.round((bytes/(1024*1024))*a)/a + " MB";
}

// ********************************************************************************************* //
})();

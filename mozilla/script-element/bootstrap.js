
// ********************************************************************************************* //
// Constants

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// ********************************************************************************************* //
// Bootstrap API

function install(params, reason)
{
}

function uninstall(params, reason)
{
}

function startup(params, reason)
{
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements())
        loadIntoWindow(enumerator.getNext());

    Services.obs.addObserver(windowWatcher, "chrome-document-global-created", false);
}

function shutdown(params, reason)
{
    Services.obs.removeObserver(windowWatcher, "chrome-document-global-created");
}

// ********************************************************************************************* //
// Window Listener

var windowWatcher =
{
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
    observe: function windowWatcher(win, topic, data)
    {
        // https://bugzil.la/795961 ?
        win.addEventListener("load", function onLoad(evt)
        {
            // load listener not necessary once https://bugzil.la/800677 is fixed
            var win = evt.currentTarget;
            win.removeEventListener("load", onLoad, false);
            if (win.document.documentElement.getAttribute("windowtype") == "navigator:browser")
                loadIntoWindow(win);
        }, false);
    }
};

// ********************************************************************************************* //
// Helpers

function loadIntoWindow(win)
{
    var url = "chrome://scriptelement/content/test.js";
    var doc = win.document;
    var script = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:script");
    script.src = url;
    script.type = "text/javascript";
    script.setAttribute("firebugRootNode", true);
    script.setAttribute("id", url);
    doc.documentElement.appendChild(script);

    Cu.reportError("Load script into the window: " + url);
}

var Cc = Components.classes;
var Ci = Components.interfaces;

function loadIntoWindow(window)
{
    if (!window)
        return;

    dump("--- window loaded\n");

    var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    observerService.addObserver(NetObserver, "http-on-modify-request", false);
}

function unloadFromWindow(window)
{
    if (!window)
        return;

    dump("--- window unloaded\n");

    var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    observerService.removeObserver(NetObserver, "http-on-modify-request", false);
}

var NetObserver =
{
    observe: function(subject, topic, data)
    {
        if (topic == "http-on-modify-request")
            dump("--- observe: " + safeGetName(subject) + "\n");
    }
}

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

function startup(aData, aReason)
{
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    var win = enumerator.getNext();
    loadIntoWindow(win);
  }

  // Load into any new windows
  wm.addListener({
    onOpenWindow: function(aWindow)
    {
      // Wait for the window to finish loading
      var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowInternal);

      domWindow.addEventListener("load", function() {
        domWindow.removeEventListener("load", arguments.callee, false);
        loadIntoWindow(domWindow);
      }, false);
    },
    onCloseWindow: function(aWindow) { },
    onWindowTitleChange: function(aWindow, aTitle) { }
  });
}

function shutdown(aData, aReason)
{
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Unload from any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    var win = enumerator.getNext();
    unloadFromWindow(win);
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) { }

var Cc = Components.classes;
var Ci = Components.interfaces;

// ********************************************************************************************* //
// Extension Hooks

// You need to enable: browser.dom.window.dump.enabled

function loadIntoWindow(window)
{
    try
    {
        var insecureObject = unwrapObject(window);
        var getter = insecureObject.__lookupGetter__("globalStorage");
        dump("window.globalStorage: " + insecureObject.globalStorage + "\n");
    }
    catch (e)
    {
        dump("EXCEPTION " + e + "\n");
    }
}

function unloadFromWindow(window)
{
}

function unwrapObject(object)
{
    if (object.wrappedJSObject)
        return object.wrappedJSObject;

    return object;
}

// ********************************************************************************************* //
// Firefox Hooks

function startup(aData, aReason)
{
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    // Load into any existing windows
    var enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements())
    {
        var win = enumerator.getNext();
        loadIntoWindow(win);
    }

    // Load into any new windows
    wm.addListener(
    {
        onOpenWindow: function(aWindow)
        {
            // Wait for the window to finish loading
            var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
                getInterface(Ci.nsIDOMWindowInternal);

            domWindow.addEventListener("load", function()
            {
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
    while(enumerator.hasMoreElements())
    {
        var win = enumerator.getNext();
        if (win)
            unloadFromWindow(win);
    }
}

function install(aData, aReason)
{
    
}

function uninstall(aData, aReason)
{
    
}

// ********************************************************************************************* //

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


// If you don't see the next line in the Error Console, check that you are running FF4.0+
Cu.reportError("bugzilla bootstrap starts");

function doASetTimeout()
{
    window.dump("Here I am, in the sandbox in the window "+window.location+"\n");
    window.setTimeout(function delay()
    {
        window.dump("Here I am, in the sandbox in a setTimeout in the window "+window.location+"\n");
    });
    return "I did a setTimeout!";
}
var systemPrincipal = Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);
function createTestDriver(window)
{
    var driver =
    {
        activate: function(callback)
        {
            try
            {
                window.dump("activate...");
                var unit =
                {
                    source: "("+doASetTimeout.toSource()+")();",
                    sandbox:  new Cu.Sandbox(systemPrincipal),
                    jsVersion: "1.8",
                    url: "breakyOption",
                    startingLineNumber: 1,
                };
                window.dump("ready to eval "+unit.source+"\n");
                var scope = {
                    window: window,
                };
                for (var p in scope)
                {
                    unit.sandbox[p] = scope[p];
                    window.dump("Added "+p+" to sandbox\n")
                }


                var evalResult = Cu.evalInSandbox(unit.source, unit.sandbox,  unit.jsVersion, unit.url, unit.startingLineNumber);
            }
            catch(exc)
            {
                Cu.reportError(exc);
            }
        },
        deactivate: function(callback)
        {

        },
    };

    return driver;
}

var testDriver = null;

function loadIntoWindow(window)
{
    if (!window)
        return;

    window.dump("____________ load into window ___________________"+window.location+"\n");

    if (!testDriver)
        testDriver = createTestDriver(window);

    testDriver.activate(function onActivate()
    {
        window.dump("--- on activate ---"+window.location+"\n");
    });

    window.dump("____________ done load into window ___________________\n");
}

function unloadFromWindow(window)
{
    if (!window)
        return;

    if (testDriver)
    {
          testDriver.deactivate(function onActivate()
          {
              window.dump("--- on activate ---\n");
          });
    }
}

/*
 bootstrap.js API
*/
function startup(aData, aReason) {
/*
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    var FBTrace = traceConsoleService.getTracer("extensions.firebug");
  FBTrace.sysout("startup "); */
   Cu.reportError("testcase startup");
    dump("------> testcase startup\n");
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  let enumerator = wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    loadIntoWindow(win);
  }

  // Load into any new windows
  wm.addListener({
    onOpenWindow: function(aWindow) {
      // Wait for the window to finish loading
      let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal);
      domWindow.addEventListener("load", function() {
        domWindow.removeEventListener("load", arguments.callee, false);
        loadIntoWindow(domWindow);
      }, false);
    },
    onCloseWindow: function(aWindow) { },
    onWindowTitleChange: function(aWindow, aTitle) { }
  });
}

function shutdown(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Unload from any existing windows
  let enumerator = wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    unloadFromWindow(win);
  }
}

function install(aData, aReason) {
    Cu.reportError("bugzilla install");
}

function uninstall(aData, aReason) {
    Cu.reportError("bugzilla unintall");
}
var bootcase = { startup: startup, shutdown: shutdown, install: install, uninstall: uninstall};
var EXPORTED_SYMBOLS = ["bootcase"];
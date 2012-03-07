var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

function createTestDriver(window)
{
    var driver = {};
    var jsd = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);
    if (!jsd)
        throw new Error("no jsd we failed.");

    function activateJSD(callback)
    {
        if (!jsd.isOn)
        {
            var startAsyncOn = new Date().getTime();
            window.dump("firebug-service.activation begin jsd.asyncOn "+startAsyncOn+"\n");

            jsd.asyncOn(  // turn on jsd for the next event
            {
                onDebuggerActivated: function doDebuggerActivated()
                {
                    var nowAsyncOn = new Date().getTime();
                    window.dump("firebug-service.activation now we are in the next event and JSD is ON "+nowAsyncOn+" delta: "+(nowAsyncOn - startAsyncOn)+"ms\n" );

                    jsd.debugHook = { onExecute:function onDebug(frame, type, rv)
                    {
                        window.dump("jsd.debugHook called \n");
                        return Ci.jsdIExecutionHook.RETURN_CONTINUE;
                    } };
                    jsd.errorHook = { onError: function onError(message, fileName, lineNo, pos, flags, errnum, exc)
                    {
                        window.dump("jsd.errorHook called "+message+"\n");
                        return false;
                    } };

                    callback();
                }
            });
        }
        else
        {
            window.dump("jsd is already on\n");
        }
    }
    function deactivateJSD() {
        if (jsd)
            jsd.off();
    }
    driver.activateJSD = activateJSD;
    driver.deactivateJSD = deactivateJSD;
    return driver;
}
var testDriver = null;
function loadIntoWindow(window) {
  if (!window) return;
  window.dump("____________ load into window ___________________\n");

  if (!testDriver)
      testDriver = createTestDriver(window);

  testDriver.activateJSD(function onActivate()
  {
      window.dump("--- on activate ---\n");
  });
  window.dump("____________ done load into window ___________________\n");
}

function unloadFromWindow(window) {
  if (!window) return;
  if (testDriver)
      testDriver.deactivateJSD();
}

/*
 bootstrap.js API
*/
function startup(aData, aReason) {
/*
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    var FBTrace = traceConsoleService.getTracer("extensions.firebug");
  FBTrace.sysout("startup "); */

    Cu.reportError("startup");
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
        Cu.reportError("opened awindow "+aWindow.location);
      let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal);
      domWindow.addEventListener("load", function() {
        domWindow.removeEventListener("load", arguments.callee, false);
        Cu.reportError("load awindow "+domWindow.location);
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

function install(aData, aReason) { }

function uninstall(aData, aReason) { }

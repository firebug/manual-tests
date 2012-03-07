var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


// If you don't see the next line in the Error Console, check that you are running FF4.0+
Cu.reportError("bugzilla bootstrap starts");

/*
 bootstrap.js API
*/
function startup(aData, aReason) {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Cu.reportError("bootstrap aData.installPath "+aData.installPath.path);
    aData.installPath.append("modules");
    Cu.reportError("bootstrap aData.installPath "+aData.installPath.path);
    let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    let alias = Services.io.newFileURI(aData.installPath);
    if (!aData.installPath.isDirectory())
        alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
    resource.setSubstitution("testcase", alias);
      Cu.reportError("bootstrap alias "+alias.spec);
      Cu.import("resource://testcase/testcase.js");
    Cu.reportError("bootstrap loaded "+bootcase);
    bootcase.startup(aData,aReason);
}

function shutdown(aData, aReason) {

}

function install(aData, aReason) {
    Cu.reportError("bugzilla install");
}

function uninstall(aData, aReason) {
    Cu.reportError("bugzilla unintall");
}

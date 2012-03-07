/* See license.txt for terms of usage */

(function() {

// ************************************************************************************************
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// ************************************************************************************************

var Tracker = function () {

    this.trackedObjects = {};

    this.track = function(name, obj) {
        this.trackedObjects[name] = obj;
        return obj;
    };

    this.getTracked = function(name) {
        return this.trackedObjects[name];
    };
};

var TrackerObserver =
{

    initialize: function() {
        //register as observer to be notified when a new page is created
        observerService.addObserver(this, "content-document-global-created", false);

        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent) {
            //also wants to be notified when a page finished loading...
            appcontent.addEventListener("DOMContentLoaded", this.onPageLoad, true);
        }

        sysout("TrackerObserver activated");
    },

    shutdown: function() {

        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent) {
            appcontent.removeEventListener("DOMContentLoaded", this.onPageLoad, true);
        }

        observerService.removeObserver(this, "content-document-global-created", false);
        sysout("TrackerObserver deactivated");
    },


    //executed after a DOMContentLoaded happened in client context
    onPageLoad: function(aEvent) {

        var doc = aEvent.originalTarget.wrappedJSObject; // doc is document that triggered "onload" event

        if(doc.location.href.search("mozilla_nativewrappers") == -1)
          return;

        sysout("onPageLoad: " + doc.location.href);

        // add event listener for page unload
        //aEvent.originalTarget.defaultView.addEventListener("unload", this.onPageUnload, true);


        TrackerObserver._makeTheComparisons(doc);
    },

    _makeTheComparisons: function(doc) {

        var retrievedFn = doc.tracker.getTracked("fn");
        var unwrappedOriginalFn = (doc.originalFn.wrappedJSObject) ? doc.originalFn.wrappedJSObject : doc.originalFn;
        var retrievedFn_wrappedJSObject = (retrievedFn.wrappedJSObject) ? retrievedFn.wrappedJSObject : retrievedFn;

        sysout("(doc.originalFn === retrievedFn): " + (doc.originalFn === retrievedFn));
        if (doc.originalFn.wrappedJSObject && retrievedFn.wrappedJSObject)
            sysout("(doc.originalFn.wrappedJSObject === retrievedFn.wrappedJSObject): " + (doc.originalFn.wrappedJSObject === retrievedFn.wrappedJSObject));
        else
            sysout("doc.originalFn.wrappedJSObject: "+doc.originalFn.wrappedJSObject+" retrievedFn.wrappedJSObject: "+retrievedFn.wrappedJSObject);

        sysout("(doc.originalFn.toSource() == retrievedFn.toSource()) " + (doc.originalFn.toSource() == retrievedFn.toSource()));

         //if XPCNativeWrapper.unwrap is available...
        if((typeof(XPCNativeWrapper) != "undefined") && XPCNativeWrapper.unwrap) {
            var unwrappedFromPage = XPCNativeWrapper.unwrap(doc.originalFn);
            var unwrappedRetrievedFn = XPCNativeWrapper.unwrap(retrievedFn);
            sysout("comparison of XPCNativeWrapper.unwrap(fn) is: " + (unwrappedFromPage === unwrappedRetrievedFn));
        }

        //now with anArray (the 2nd thing tracked in client page)
        var retrievedArray = doc.tracker.getTracked("array");

        sysout("(doc.originalArray === retrievedArray) " + (doc.originalArray === retrievedArray));
        for(var i=0; i < retrievedArray.length; i++) {
            sysout("(doc.originalArray["+i+"] === retrievedArray["+i+"]) with type ("+typeof(retrievedArray[i])+") is: " + (doc.originalArray[i] === retrievedArray[i]));
        }

    },

    onPageUnload: function(aEvent) {
        // do something
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    observe: function(subject, topic, data)
    {
        if ((topic == "content-document-global-created") && (subject instanceof Ci.nsIDOMWindow)) {

            var win = subject;
            var docPage = win.wrappedJSObject.document;

            //INJECT Tracker in page
            var tracker = new Tracker();
            docPage.tracker = tracker;

            //also inject public functions in page to interact with the Tracker
            var trackFn = function(name, obj) {
                return tracker.track(name, obj);
            };
            _addMozillaExecutionGrants(trackFn);
            docPage.track = trackFn;

            var getFn = function(name) {
                return tracker.getTracked(name);
            };
            _addMozillaExecutionGrants(getFn);
            docPage.getTracked = getFn;
        }
    }
};


//required as of FF 4
function _addMozillaExecutionGrants(fn) {
    if(!fn.__exposedProps__) {
        fn.__exposedProps__ = {};
    }
    fn.__exposedProps__.apply = "r";
    fn.__exposedProps__.call = "r";
}

// ************************************************************************************************
// Logging

function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");
}

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { TrackerObserver.initialize(); }, false);
window.addEventListener("unload", function() { TrackerObserver.shutdown(); }, false);

// ************************************************************************************************
})();

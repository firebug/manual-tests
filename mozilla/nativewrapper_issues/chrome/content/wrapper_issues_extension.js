FBL.ns(function() { with (FBL) {

	//required as of FF 4
	var _addMozillaExecutionGrants = this._addMozillaExecutionGrants = function(fn) {
		if(!fn.__exposedProps__) {
			fn.__exposedProps__ = {};
		}		
		fn.__exposedProps__.apply = "r";
		fn.__exposedProps__.call = "r";
	};
	

	var Tracker = extend(Firebug.Module, {
		
		trackedObjects: null,
		
	    initialize: function() {
		
			Firebug.Module.initialize.apply(this, arguments);			
			
			this.trackedObjects = {};
		
	        if (Firebug.Debugger) {
	    		Firebug.Debugger.addListener(this);
	        }
	        
		},

		track: function(name, obj) {
			//var unwrapped = unwrapObject(obj);
			//this.trackedObjects[name] = unwrapped;
			this.trackedObjects[name] = obj;
			return obj;
		},
		
		/*object*/getTracked: function(name) {
			return this.trackedObjects[name];
		},
		
	    initContext: function(context, persistedState)
	    {
			Firebug.Module.initContext.apply(this, arguments);

			context.trackingAPI = this;
			
			var docPage = unwrapObject(context.window).document;
		
			var self = this;
			var trackFn = function(name, obj) {
				return self.track(name, obj);
			};
			_addMozillaExecutionGrants(trackFn);
			docPage.track = trackFn;
			
			var getFn = function(name) {
				return self.getTracked(name);
			};			
			_addMozillaExecutionGrants(getFn);
			docPage.getTracked = getFn;			
	    },

	    /**
	     * Called after a context's page gets DOMContentLoaded
	     */
	    loadedContext: function(context) {
	    	Firebug.Console.log("loaded", context);
	    	
	    	Firebug.CommandLine.evaluate("doStuff();", context);
	    },
	    
	    
	    // FBTest

	    // Expose our test list to the FBTest console for automated testing.
	    onGetTestList: function(testLists) {
	        testLists.push({
	            extension: "wrapperextension",
	            testListURL: "chrome://wrapper_issues_extension/content/fbtest/testlists/chromed-testList.html"
	        });
			testLists.push({			
	            extension: "wrapperextension",
	            testListURL: "http://getfirebug.com/tests/mozilla/nativewrapper_issues/chrome/content/fbtest/testlists/testList.html"
	        });

	    }
	    
		
	});

	Firebug.Tracker = Tracker;

	
	
	Firebug.registerModule(Tracker);
}});
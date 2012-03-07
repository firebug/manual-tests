FBL.ns(function() { with (FBL) {

	var OnSourceFileCreatedTester = extend(Firebug.Module, {
		
	    initialize: function() {
		
			Firebug.Module.initialize.apply(this, arguments);			
			
	        if (Firebug.Debugger) {
	    		Firebug.Debugger.addListener(this);
	        }
	        
		},
	
	    initContext: function(context, persistedState)
	    {
			Firebug.Module.initContext.apply(this, arguments);

			context.onSourceFileCreatedInvoked = false;
	    },

	    /**
	     * called on each dojo file loaded (actually for every file).
	     * This way, we can detect when dojo.js is loaded and take action. 
	     */
	    onSourceFileCreated : function (context, sourceFile) {
	    	context.onSourceFileCreatedInvoked = true;
	    },
	    
	    // FBTest

	    // Expose our test list to the FBTest console for automated testing.
	    onGetTestList: function(testLists) {
	        testLists.push({
	            extension: "OnSourceFileCreatedTester",
	            testListURL: "chrome://onSourceFileCreated_extension_test/content/fbtest/testlists/chromed-testList.html"
	        });
			testLists.push({
	            extension: "OnSourceFileCreatedTester",
	            testListURL: "http://getfirebug.com/tests/mozilla/issue4305/chrome/content/fbtest/testlists/testList.html"
	        });
	    }
	    
		
	});

	
	Firebug.registerModule(OnSourceFileCreatedTester);
}});
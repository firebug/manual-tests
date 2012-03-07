// Test entry point.
function runTest()
{	
	FBTest.progress("onSourceFileCreated_extension_test START");
	
	FBTest.openURL(basePath + "onSourceFileCreated_extension_test.html", function(win) {
		FBTest.progress("onSourceFileCreated_extension_test: Loaded page");
		FBTest.openFirebug();
	    FBTest.enableAllPanels();	    
	    FBTest.progress("onSourceFileCreated_extension_test:  enabled all panels");
	    
		win = FBTest.FirebugWindow.FBL.unwrapObject(win);
    
		var context = FW.Firebug.currentContext;
		
		try {

			FBTest.progress("About to check if onSourceFileCreated was invoked");
			FBTest.compare(true, context.onSourceFileCreatedInvoked, "onSourceFileCreated was invoked");
			
			
			FBTest.progress("onSourceFileCreated_extension_test END");
								
		} catch (err) {
			FBTest.exception("Test: ", err);
		} finally {
			FBTest.testDone();
		}	

	});
}

function applyTests(context) {

}

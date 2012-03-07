function runTest()
{	

	FBTest.progress("test_wrapped_issues test START");
	
	FBTest.openURL(basePath + "test_wrapped_issues.html", function(win) {
		FBTest.progress("test_wrapped_issues test Loaded page");
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    
	    FBTest.progress("test_wrapped_issues test:  enabled all panels");
	    
		FBTest.reload(function(win) {
			FBTest.progress("test_wrapped_issues test:  page reloaded");
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			var FBL = FBTest.FirebugWindow.FBL;
			var context = FW.Firebug.currentContext;
			
			try {
				var api = context.trackingAPI;	    		    	

				//objects created in web page...
				var pageFn = win.fn;
				var pageObj = win.obj;
				var pageComplexObj = win.complexObj;				
				var pageNum = win.num;
				var pageStr = win.str;

				//cfn, cobj, etc are the returned values from track function (invoked from FBTest code)
				//we are here invoking "track" with the objects created in web page as arguments  
				var cfn = api.track("fn", pageFn);
				var cobj = api.track("obj", pageObj);
				var ccomplex = api.track("complex", pageComplexObj);
				var cnum = api.track("num", pageNum);
				var cstr = api.track("str", pageStr);
				
				//res* are the results of invoking here getTracked() , and getting objects that were tracked from FBTest code
				var resFn = api.getTracked("fn");
				var resObj = api.getTracked("obj");
				var resNum = api.getTracked("num");
				var resStr = api.getTracked("str");
				var resComplex = api.getTracked("complex");

				FBTest.progress("(1) About to compare: objects created in page VS objects returned by 'getTracked' function (after tracking them from FBTest code)");
				FBTest.compare(pageFn, resFn, "page created vs chrome tracked/retrieved function ==");
				FBTest.compare(pageObj, resObj, "page created vs chrome tracked/retrieved obj ==");
				FBTest.compare(pageComplexObj, resComplex, "page created vs chrome tracked/retrieved Complex obj ==");
				FBTest.compare(pageNum, resNum, "page created vs chrome tracked/retrieved num ==");
				FBTest.compare(pageStr, resStr, "page created vs chrome tracked/retrieved str ==");
				FBTest.progress("END OF (1)");

				FBTest.progress("(2) About to compare: 'track' invocation (from FBTest code) returned objects VS those same objects returned by 'getTracked' function");
				FBTest.compare(cfn, resFn, "chrome track result vs chrome retrieved (object tracked in chrome), function ==");
				FBTest.compare(cobj, resObj, "chrome track result vs chrome retrieved(object tracked in chrome), obj ==");
				FBTest.compare(ccomplex, resComplex, "chrome track result vs chrome retrieved(object tracked in chrome), Complex obj ==");
				FBTest.compare(cnum, resNum, "chrome track result vs chrome retrieved(object tracked in chrome), num ==");
				FBTest.compare(cstr, resStr, "chrome track result vs chrome retrieved(object tracked in chrome), str ==");
				FBTest.progress("END OF (2)");
				
				//fn2, obj2, etc are the results from invoking "track" function from web page.
				var trackResultInPage_fn2 = win.fn2;
				var trackResultInPage_obj2 = win.obj2;
				var trackResultInPage_complex2 = win.complexObj2;
				var trackResultInPage_num2 = win.num2;
				var trackResultInPage_str2 = win.str2;
				
				//tracked_* are the results of invoking getTracked() here (and getting objects tracked in web page)
				var tracked_fn2 = api.getTracked("fn2");
				var tracked_obj2 = api.getTracked("obj2");
				var tracked_num2 = api.getTracked("num2");
				var tracked_str2 = api.getTracked("str2");
				var tracked_complex2 = api.getTracked("complex2");
				
				var unwrapped = XPCNativeWrapper.unwrap(tracked_fn2);
				
				
				FBTest.progress("(3) About to compare: 'track' invocation (invoked from web page) returned objects, VS corresponding objects returned by 'getTracked' function (after also tracking them from FBTest code)");
				FBTest.compare(trackResultInPage_fn2, resFn, "page track result vs chrome tracked/retrieved(object tracked in chrome), function ==");
				FBTest.compare(trackResultInPage_obj2, resObj, "page track result vs chrome tracked/retrieved(object tracked in chrome), obj ==");
				FBTest.compare(trackResultInPage_complex2, resComplex, "page track result vs chrome tracked/retrieved(object tracked in chrome), complexObj ==");
				FBTest.compare(trackResultInPage_num2, resNum, "page track result vs chrome tracked/retrieved(object tracked in chrome), num ==");
				FBTest.compare(trackResultInPage_str2, resStr, "page track result vs chrome tracked/retrieved(object tracked in chrome), str ==");
				FBTest.progress("END OF (3)"); 
							
				
				FBTest.progress("(4) About to compare: 'track' invocation (invoked from web page) returned objects, VS those same tracked objects but returned from 'getTracked' function invoked from this FBTest JS code");
				//...this is the first test that fails...
				FBTest.compare(trackResultInPage_fn2, tracked_fn2, "page track result vs chrome retrieved (object tracked in page), function == ");
				FBTest.compare(trackResultInPage_fn2.toSource(), tracked_fn2.toSource(), "page track result vs chrome retrieved  (object tracked in page), function.toSource() == ");
				FBTest.compare(undefined, trackResultInPage_fn2.wrappedJSObject, "wrappedJSObject is undefined");			
				FBTest.compare(FBL.unwrapObject(trackResultInPage_fn2), FBL.unwrapObject(tracked_fn2), "page track result vs chrome retrieved  (object tracked in page), FBL.unwrapObject function == ");				
				if ((typeof(XPCNativeWrapper) != "undefined") && XPCNativeWrapper.unwrap) {
					FBTest.compare(XPCNativeWrapper.unwrap(trackResultInPage_fn2), XPCNativeWrapper.unwrap(tracked_fn2), "page track result vs chrome retrieved (object tracked in page), XPCNativeWrapper.unwrap function == ");
				}
				FBTest.compare(trackResultInPage_obj2, tracked_obj2, "page track result vs chrome retrieved (object tracked in page), obj ==");
				FBTest.compare(trackResultInPage_complex2, tracked_complex2, "page track result vs chrome retrieved (object tracked in page), Complex obj ==");
				FBTest.compare(trackResultInPage_num2, tracked_num2, "page track result vs chrome retrieved (object tracked in page), num ==");
				FBTest.compare(trackResultInPage_str2, tracked_str2, "page track result vs chrome retrieved (object tracked in page), str ==");
				FBTest.progress("END OF (4)");

				FBTest.progress("(5) About to compare: html page created objects, VS objects returned from 'getTracked' function invoked from this FBTest JS code");
				FBTest.compare(pageFn, tracked_fn2, "page created vs chrome retrieved (object tracked in page), function == ");
				FBTest.compare(pageObj, tracked_obj2, "page created vs chrome retrieved (object tracked in page), obj ==");
				FBTest.compare(pageComplexObj, tracked_complex2, "page created vs chrome retrieved (object tracked in page), Complex obj ==");
				FBTest.compare(pageNum, tracked_num2, "page created vs chrome retrieved (object tracked in page), num ==");
				FBTest.compare(pageStr, tracked_str2, "page created vs chrome retrieved (object tracked in page), str ==");
				FBTest.progress("END OF (5)");

				FBTest.progress("(6) About to compare: 'track' invocation (from FBTest code) returned objects VS objects returned from 'getTracked' function invoked from this FBTest JS code");
				FBTest.compare(cfn, tracked_fn2, "chrome track result vs chrome retrieved (object tracked in page), function == ");
				FBTest.compare(cfn.toSource(), tracked_fn2.toSource(), "chrome track result vs chrome retrieved (object tracked in page), function.toSource() == ");
				FBTest.compare(undefined, cfn.wrappedJSObject, "wrappedJSObject is undefined");			
				FBTest.compare(FBL.unwrapObject(cfn), FBL.unwrapObject(tracked_fn2), "chrome track result vs chrome retrieved (object tracked in page), FBL.unwrapped function == ");
				FBTest.compare(cobj, tracked_obj2, "chrome track result vs chrome retrieved (object tracked in page), obj ==");
				FBTest.compare(ccomplex, tracked_complex2, "chrome track result vs chrome retrieved (object tracked in page), Complex obj ==");
				FBTest.compare(cnum, tracked_num2, "chrome track result vs chrome retrieved (object tracked in page), num ==");
				FBTest.compare(cstr, tracked_str2, "chrome track result vs chrome retrieved (object tracked in page), str ==");
				FBTest.progress("END OF (6)");

				var tracked_fn2_again = api.getTracked("fn2");
				var tracked_obj2_again = api.getTracked("obj2");
				var tracked_num2_again = api.getTracked("num2");
				var tracked_str2_again = api.getTracked("str2");
				var tracked_complex2_again = api.getTracked("complex2");

				FBTest.progress("(7) About to compare: objects returned from 'getTracked' function invoked from this FBTest JS code VS the same objects again retrieved using 'getTracked' function");
				FBTest.compare(tracked_fn2_again, tracked_fn2, "chrome retrieved (object tracked in page) VS itself (retrieved again), function == ");
				FBTest.compare(tracked_obj2_again, tracked_obj2, "chrome retrieved (object tracked in page) VS itself (retrieved again), obj ==");
				FBTest.compare(tracked_complex2_again, tracked_complex2, "chrome retrieved (object tracked in page) VS itself (retrieved again), Complex obj ==");
				FBTest.compare(tracked_num2_again, tracked_num2, "chrome retrieved (object tracked in page) VS itself (retrieved again), num ==");
				FBTest.compare(tracked_str2_again, tracked_str2, "chrome retrieved (object tracked in page) VS itself (retrieved again), str ==");
				FBTest.progress("END OF (7)");


				FBTest.progress("About to open alert dialog in page to avoid loosing console logs when test ends");				

			
				
				FBTest.progress("test_wrapped_issues test END");
				
				
				
			} catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	
		});
	});
}

function applyTests(context) {

}

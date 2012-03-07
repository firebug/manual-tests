(copied from http://code.google.com/p/fbug/issues/detail?id=4305)
	
	** chrome urls in FBTest don't work correctly in FF4.0
	
	
	* this extension has 2 test lists: 
	** one using chrome://... and the other http:// based. (you can see them by fbtest:all)

the behavior is noticed only when using chrome:// based test urls and the test doing a page reload , i.e. FBTest.reload(function(win) {...});
	
	
	you need to install the extension , and load fbtest:all
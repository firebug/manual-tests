<?php
	$last = time();// filemtime(__FILE__);
	$etag = md5('409-3-#$0' . $last . strtolower($_SERVER['REQUEST_URI'])); 
	$lastModifiedGMT = gmdate('D, d M Y H:i:s', $last).' GMT';
	header("Pragma: public");
	header('ETag: "'.$etag.'"');
	header("Last-Modified: $lastModifiedGMT");
	$expiresOffset = -10000 ; //no cache -- force revalidation using etag	
	header("Content-type: text/javascript; charset=ISO-8859-1");
	header("Vary: Accept-Encoding");  // Handle proxies
	header("Expires: " . @gmdate("D, d M Y H:i:s", @time() + $expiresOffset) . " GMT");
	if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
		if (strpos($_SERVER['HTTP_IF_NONE_MATCH'], $etag) !== false) {
			header("Pragma: public", true, 304);
			exit;
		}
	}
	$text = file_get_contents("http://www.extjs.com/deploy/dev/ext-all-debug.js");
	echo $text;
?>
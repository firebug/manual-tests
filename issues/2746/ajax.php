<?php
if ($_POST) {
	// POST request
	header("HTTP/1.1 302 Moved Temporarily");
	header("Location: ".$_SERVER['REQUEST_URI']);
} else {
	// GET request
	printf("request count: %d", 14);
}
exit;
?>

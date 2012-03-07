<?php
	echo "<h3>Raw content</h3>";
	echo '<pre>';
	var_dump(file_get_contents('php://input'));
	echo "</pre>";

	echo "<h3>POST content</h3>";
	echo '<pre>';
	var_dump($_POST);
	 echo "</pre>";
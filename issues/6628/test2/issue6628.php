<?php

$cookieName = basename(dirname(__FILE__));

if (isset($_COOKIE[$cookieName]))
{
	printf('Cookie <em>%s</em> was already set', $cookieName);
}
else
{
	setcookie($cookieName, 'hi!');
	printf('Cookie <em>%s</em> was NOT set, setting cookie now...', $cookieName);
}

?>
<?php
    if (!isset($_GET["redirect"]))
        $_GET["redirect"] = 0;

    if ($_GET["redirect"] < 3)
    {
        header("HTTP/1.1 302 Moved Temporarily");
        header("Location: ".$_SERVER["PHP_SELF"]."?redirect=".($_GET["redirect"]+1));
        die();
    }
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 4957: 	Net tab Timeline is incorrect for files with 302s before getting 200</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=4957">Issue 4957</a>: 	Net tab Timeline is incorrect for files with 302s before getting 200</h1>
        </header>
        <div>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable and switch to the <em>Net</em> panel</li>
                    <li>Reload the page</li>
                </ol>
                <h3>Expected result</h3>
                <ul>
                    <li>Three redirects (with HTTP status 302) to <code>issue4957.php</code> are shown inside the request list</li>
                    <li>One request to <code>issue4957.php</code> shows HTTP status 200</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmx.de</footer>
        </div>
    </body>
</html>
<?php
   $nowInAYear = new DateTime();
   $nowInAYear->add(new DateInterval('P1Y'));
   header('Set-Cookie: issue7637=value;domain='.$_SERVER['HTTP_HOST'].';path=/;expires='.$nowInAYear->format('d M Y H:i:s e'));
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 7637: Broken display of received cookies with no spaces between attributes</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=7637">Issue 7637</a>: Broken display of received cookies with no spaces between attributes</h1>
        </header>
        <div>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable and switch to the <em>Net</em> panel</li>
                    <li>Reload the page</li>
                    <li>Expand the request for <em>issue7637.php</em></li>
                    <li>Switch to the <em>Cookies</em> tab</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li class="error">The value is incorrectly displayed as <code>value;domain</code>.</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li class="error">The value should be displayed as <code>value</code>.</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

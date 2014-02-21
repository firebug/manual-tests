<?php
    header('HTTP/1.0 401 Not Authorized');
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 7162: network request resulting in HTTP 401 does not display correctly in 'Net' tab</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=7162">Issue 7162</a>: network request resulting in HTTP 401 does not display correctly in 'Net' tab</h1>
        </header>
        <div>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable and switch to the <em>Net</em> panel</li>
                    <li>Reload the page</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li class="error">The <em>Net</em> panel says there's one request in it's request summary, though the request is not displayed.</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li>The request should be listed.</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

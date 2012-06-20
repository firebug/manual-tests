<?php
    setcookie('cookie1', 'Hello Firebug user!', 0, '/Scribble/sebastian.zartner');
    setcookie('cookie2', 'Hello Firebug user!', 0, '/Scribble/sebastian.zartner/');
    setcookie('cookie3', 'Hello Firebug user!', 0, '/Scribble/sebastian.zartner/issue5589.php');
    setcookie('cookie4', 'Hello Firebug user!', 0, '/Scribble/sebastian.zartner/issue5589.php/');
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 5589: Cookie on same path as script name won't be shown</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
        <style type="text/css">
        section#output {
            display: block;
        }
        </style>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=5589">Issue 5589</a>: Cookie on same path as script name won't be shown</h1>
        </header>
        <div>
            <section id="content">
                <section id="output"><pre><?php var_dump($_COOKIE); ?></pre></section>
            </section>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable and switch to the <em>Cookies</em> panel</li>
                    <li></li>
                    <li>Reload the page</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li>An info message is shown inside the <em>CSS</em> panel that there are no CSS rules.</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li>
                        The following should be displayed inside the <em>CSS</em> panel:<br/>
                        <code>
                        </code>
                    </li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmx.de</footer>
        </div>
    </body>
</html>

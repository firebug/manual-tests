<?php
    setcookie('cookie1', 'Hello Firebug user!', 0, '/tests/manual/issues/5591');
    setcookie('cookie2', 'Hello Firebug user!', 0, '/tests/manual/issues/5591/');
    setcookie('cookie3', 'Hello Firebug user!', 0, '/tests/manual/issues/5591/issue5591');
    setcookie('cookie4', 'Hello Firebug user!', 0, '/tests/manual/issues/5591/issue5591.php');
    setcookie('cookie5', 'Hello Firebug user!', 0, '/tests/manual/issues/5591/issue5591.php/');
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 5591: Cookie on same path as script name won't be shown</title>
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
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=5591">Issue 5591</a>: Cookie on same path as script name won't be shown</h1>
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
                    <li>Check the filter <em>Cookies</em> / <em>Filter Cookies By Current Path</em></li>
                    <li>Reload the page</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li>Only <code>cookie1</code> and <code>cookie2</code> are listed</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li><code>cookie1</code>, <code>cookie2</code> and <code>cookie4</code> should be listed</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmx.de</footer>
        </div>
    </body>
</html>

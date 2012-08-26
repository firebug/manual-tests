<?php
    setcookie('issue5607-1', 'árvíztűrő tükörfúrógép', 0, '/');
    setrawcookie('issue5607-2', 'árvíztűrőtükörfúrógép', 0, '/');
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 5607: Incorrect cookie value decoding</title>
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
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=5607">Issue 5607</a>: Incorrect cookie value decoding</h1>
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
                    <li>Reload the page</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li>There are two cookies listed with their UTF-8 encoded values being displayed incorrectly</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li>The values of the cookies should be displayed as 'árvíztűrő tükörfúrógép' and 'árvíztűrőtükörfúrógép'.</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

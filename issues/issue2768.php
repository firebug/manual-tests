<!DOCTYPE html>
<html>
    <head>
        <title>Issue 2768: CSS panel has a long pause on pages with complex css</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
        <style type="text/css">
        <?php
            for ($i=1; $i<=1000; $i++)
                echo "#rule$i { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; }\r\n";
        ?>
        </style>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=2768">Issue 2768</a>: CSS panel has a long pause on pages with complex css</h1>
        </header>
        <div>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Switch to the <em>CSS</em> panel</li>
                    <li>Select <em>Inline</em> from the CSS Location Menu</li>
                </ol>
                <h3>Expected result</h3>
                <ul>
                    <li>1.000 rules should be displayed</li>
                    <li>The display should not be delayed remarkably (only ~1s)</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

<?php
    header('Link: </en/>; rel="alternate"; hreflang="en"', false);
    header('Link: </ru/>; rel="alternate"; hreflang="ru"', false);
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Issue 5869: Two headers are combined to one</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=5869">Issue 5869</a>: Two headers are combined to one</h1>
        </header>
        <div>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable and switch to the <em>Net</em> panel</li>
                    <li>Reload the page</li>
                    <li>Expand the request for <code>issue5869.php</code></li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li class="error">There is only one <code>Link</code> header</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li>
                        There should be two <code>Link</code> headers:<br/>
<code>
Link: &lt;/en/&gt;; rel="alternate"; hreflang="en"
Link: &lt;/ru/&gt;; rel="alternate"; hreflang="ru"
</code>
                    </li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

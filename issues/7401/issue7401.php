<?php
    $numberOfExecutions = 1;
    if (isset($_COOKIE['issue7401']))
        $numberOfExecutions = $_COOKIE['issue7401'] + 1;
    setcookie('issue7401', $numberOfExecutions, time() + 86400, dirname($_SERVER['SCRIPT_NAME']));
?>

<!DOCTYPE html>
<html>
    <head>
        <title>Issue 7401: Debugger causes double submit</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <link href="https://getfirebug.com/tests/head/_common/testcase.css" type="text/css" rel="stylesheet"/>
        <script type="text/javascript">
            console.log("Hello");
        </script>
    </head>
    <body>
        <header>
            <h1><a href="http://code.google.com/p/fbug/issues/detail?id=7401">Issue 7401</a>: Debugger causes double submit</h1>
        </header>
        <div>
<?php
    if ($_SERVER['REQUEST_METHOD'] == 'GET')
    {
        echo '<section id="content">
                  <form action="'.$_SERVER['PHP_SELF'].'" method="post">
                      <button type="submit">Make POST</button>
                  <form>
              </section>';
    }
?>
            <section id="description">
                <h3>Steps to reproduce</h3>
                <ol>
                    <li>Open Firebug</li>
                    <li>Enable the <em>Cookies</em> and the <em>Script</em> panel</li>
                    <li>
                        Switch to the <em>Cookies</em> panel<br/>
                        <span class="ok">&rArr; There should be a cookie <code>issue7401</code> with <code>1</code> as value.</span>
                    </li>
                    <li>Delete the <code>issue7401</code> cookie via <em>Cookies</em> &gt; <em>Remove Cookies</em></li>
                    <li>Click the <em>Make POST</em> button above</li>
                </ol>
                <h3>Observed result</h3>
                <ul>
                    <li class="error">&rArr; The <code>issue7401</code> is created with value <code>2</code> (=executed twice).</li>
                </ul>
                <h3>Expected result</h3>
                <ul>
                    <li>The server-side script should just be requested once, i.e. the cookie value should be <code>1</code>.</li>
                </ul>
            </section>
            <footer>Sebastian Zartner, sebastianzartner@gmail.com</footer>
        </div>
    </body>
</html>

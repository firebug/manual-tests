<?php
    if (empty($_GET))
    {
        header('Status: 302 Found');
        header('Location: issue4009.php?param');
        header('Content-Type: text/plain');
    }
    else
    {
        header('Content-Type: text/plain');
        echo 'Hello Firebug user!';
    }
?>
<?php
    if ($_SERVER['HTTP_ACCEPT'] === 'text/plain')
    {
        header('Content-Type', 'text/plain');
        echo 'bad - you should not be reading this';
    }
    else
    {
        header('Content-Type', 'application/octet-stream');
        echo 'ok!';
    }
?>
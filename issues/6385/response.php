<?php
    header('Content-Type', 'text/plain');
    echo $_SERVER['HTTP_ACCEPT'] === 'text/plain' ? 'bad - you should not be reading this' : 'ok!';
?>
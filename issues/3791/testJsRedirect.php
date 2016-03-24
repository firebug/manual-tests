<?php
$scriptName = $_SERVER['SCRIPT_NAME'];

if( !$_SERVER["QUERY_STRING"] ) {
    header( "location: $scriptName" . "?1957282936" );
} else {
    include( "js/test.js" );
}

?>

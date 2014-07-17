<?php
// Fill up array with names
$a[]="Anna";
$a[]="Anna2";
$a[]="Anna3";
$a[]="Anna4";
$a[]="Anna5";
$a[]="Anna6";
$a[]="Anna7";
$a[]="Anna8";
$a[]="Anna9";

// get the q parameter from URL
$q=$_REQUEST["q"]; $hint="";

if (ob_get_level() == 0) ob_start(); 

// lookup all hints from array if $q is different from ""
if ($q !== "") {
  $q=strtolower($q); $len=strlen($q);
  foreach($a as $name) {
    if (stristr($q, substr($name,0,$len))) {
      echo $name;
    }

    ob_flush();
    flush();
    sleep(1);
  }
  
}

ob_end_flush();
?>

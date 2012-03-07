<?php
$randomNumber = rand(0,1000);
$success = false;
$time = microtime();
if($randomNumber > 100) {
     $success = true;
}
$success = array('success' => $success, 'time' => $time);

echo json_encode($success);

?>
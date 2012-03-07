<?php
usleep(100000); // sleep for 1/10th of a second
header("Cache-Control: max-age=300, private");
echo microtime(true);

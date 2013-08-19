<?php
  // Defer font loading by 5 seconds
  sleep(5);

  $fh = fopen('TitilliumMaps26L001.woff', 'r');
  $contents = fread($fh, 30000);
  fclose($fh);

  header('Content-Type: application/font-woff');
  echo $contents;
?>
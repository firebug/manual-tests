<?php
  $firebugInstalled = (stripos($_SERVER['HTTP_USER_AGENT'], 'firebug') !== false);
?>
<!DOCTYPE html>
<html>
  <head>
    <title>Issue 4395: Inclusion of "Firebug" in the User-Agent</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <style type="text/css">
      body {
        background: #ffffff;
        font: small arial, sans-serif;
        margin: 5px auto;
        width: 815px;
      }
      h1 {
        font-size: large;
        font-weight: normal;
        padding: 1em 0;
        text-transform: uppercase;
      }
      h2 {
        font-size: medium;
        font-weight: normal;
        padding: 0.5em 0;
        text-transform: uppercase;
        margin: 0;
      }
      ol {
        margin:0;
      }
      ol li {
        padding-bottom: 1em;
      }
      ul li {
        padding: 0;
      }
      #content {
        background: #9acbe4;
        padding: 10px 20px;
      }
      #content div {
        margin: 5px 0;
        padding: 5px;
      }
      #output {
        width: auto!important;
        background: #e8f0ff;
      }
    </style>
    <?php
      if($firebugInstalled) {
        echo '<script type="text/javascript">'.
             '  console.log("YES, Firebug is installed!");'.
             '</script>';
      }
    ?>
  </head>
  <body>
    <h1><a href="http://code.google.com/p/fbug/issues/detail?id=4395">Issue 4395</a>: Inclusion of "Firebug" in the User-Agent</h1>
    <div id="content">
      <div id="output">
        <?php
          echo $firebugInstalled ? 'YES, Firebug is installed!' : 'NO, either Firebug is not installed or you turned off the <code>modifyUserAgent</code> preference.';
        ?>
      </div>
      <ol>
        <li>Set the option <code>extensions.firebug.modifyUserAgent</code> to <code>true</code></li>
        <li>Reload the page</li>
      </ol>
      <ul>
        <li>
          <strong>Observed:</strong> Currently there is no preference to toggle Firebug integration in the user agent string,
          so the output is always "NO, either Firebug is not installed or you turned off the <code>modifyUserAgent</code> preference.".
        </li>
        <li><strong>Expected:</strong> By setting the preference to true the script should output "YES, Firebug is installed!"</li>
      </ul>
    </div>
  </body>
</html>
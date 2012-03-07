<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test firebug</title>

    
    <script src="mootools.js" type="text/javascript"></script>
    <script src="js.js" type="text/javascript"></script>
  
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
   </head>
  <body>
  I've reported this problem to the firebug team: <a href="https://code.google.com/p/fbug/issues/detail?id=4341">issue 4341</a>     <br />
    <strong>Problem:</strong><br />
    Only the first request returns the json object  <br />
    subsequent request don't show the json object in the console response, but the application behaves as expected (the json object seems to be there)<br />
    However the proper responses are to be seen in firebug's net tab... <br />
    
    <strong>How to reproduce:</strong> <br />
    in firebug's console type: <br />
    <pre>
    test = new imc;
    test.request();
    </pre>

<button id="testButton" onclick="onExecuteTest()">Execute Test</button>
<br/>
<script type="text/javascript">
function onExecuteTest()
{
    test = new imc;
    test.request();
}
</script>

    the php file has the following content: <br />
    <pre>
       
$randomNumber = rand(0,1000);
$success = false;
$time = microtime();
if($randomNumber > 100) {
     $success = true;
}
$success = array('success' => $success, 'time' => $time);

echo json_encode($success);


    </pre>
  </body>
</html>

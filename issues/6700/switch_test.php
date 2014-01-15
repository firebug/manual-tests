<!DOCTYPE HTML>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<title>switch_test</title>
<style type="text/css"></style>
<script type="text/javascript">



/*
	Place A Breakpoint On Line 126
	see obsevations at line 89
*/









































































/*
Observations :

	In all cases Firefox resolves the switch as expected (see console output)

	Behaviour changes when the number of linefeeds prior to a CASE test line changes from <126 to >125 (and sometimes linefeeds after the CASE)

	Behaviour sometimes changes if the CASE test is changed (change case3 to 1 & all of switch B will have good breakpoints)

	Breakpoint failure and the line number being grey in Firebug script panel is consistent.

	Does not seem to matter what is on the prior lines, only that there are linefeeds.

	In switch B all lines following the 'bad' CASE test causes disabled breakpoints for the rest of the function (even outside the switch)

*/


test_data=[0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]

function do_naught(){
}

/*	Removing one or more of any previous line will enable the breakpoint	*/
onload=function(){
	var case0=true
	var case1=true
	var case3=true
/*	Removing one or more of the following linefeeds will enable the breakpoint	*/






	console.debug('--- Switch A')	/*	Should be Line # 123	*/
	switch(true){
	case(case0):					/*	Placing a linefeed below this line will enable the breakpoint */
		console.debug('case 0')		/*	PLACE A BREAKPOINT ON THIS LINE, it will not break until you remove a line or add, as mentioned in the other comments */
		break						/*	Placing a linefeed above this line will enable the breakpoint */
	case(case1):
		console.debug('case 1')
		break
	default:
		console.debug('Default')
		break
	}



	console.debug('Between switches')



	console.debug('--- Switch B')
	switch(true){
	case 2:
		console.debug('case 2')
		break
	case (case3):
		console.debug('case 3')
		break
	default:
		console.debug('Default')
		break
	}
	console.debug('Breakpoint here fails as well (outsite switch)')
	following()
}
function following(){
	console.debug('Breakpoint in following function is fine')
}
</script>
</head>
<body>
	Select the script tab in firebug
	<br>- Place a breakpoint on line 126.
	<br>- Reload the page, confirm the break point is disabled (greyed out)
	<br>- Delete any blank line above line 126
	<br>- Reload the page, the break point is enabled!
	<br>
	<br>
	<br>
<br>In all cases Firefox resolves the switch as expected (see console output)
<br>
<br>Behaviour changes when the number of linefeeds prior to a CASE test line changes from <126 to >125 (and sometimes linefeeds after the CASE)
<br>
<br>Behaviour sometimes changes if the CASE test is changed (change "case3" to "1" & all of switch B will have good breakpoints)
<br>
<br>Breakpoint failure and the line number being grey in Firebug script panel is consistent.
<br>
<br>Does not seem to matter what is on the prior lines, only that there are linefeeds.
<br>
<br>In switch B all lines following the 'bad' CASE test causes disabled breakpoints for the rest of the function (even outside the switch)


</body>
</html>
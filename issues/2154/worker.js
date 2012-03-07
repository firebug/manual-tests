// worker that counts to 5000, posts a message every 100, attempts to call console.log every 500

for( var i = 1; i < 5001; i++ ){
	if( i%100 == 0){ // IF i is a multiple of 100
		postMessage(i)
	}
	
	if( i%500 == 0){ // IF i is a multiple of 500
		postMessage("I'm attempting to call console.log()")
		
		try { console.log("i is ", i , " - attempt succeded! :D"); }
		catch (err){ postMessage("Looks like I failed :(")}
	}
}

postMessage( "I've reached 5000 - That's all from me." )


/* One workaround / bodge I've used is to postMessage() to call console.log() in the parent worker. To differentiate from an ordinary message, I prefixed the message(s) with "/log ". 

So in a worker such as this I would write:

var console = {};

console.log = function(){
	var string = "/log ";
	
	for( var i = 0, j = arguments.length; i < j; i++){
		string += arguments[i];
		string += ",";
	}
	string = string.substring(0, substring.length-1); // removes that last extra comma
	
	postMessage( string );
}

and in the worker's parent I add this to the beginnning of worker.onmessage 

if( event.data.substring(0,4) == "/log" ){
	eval("console.log(" + str + ")"); // I know eval is evil, but I can't think of another way to do this.
} else {
	//...	
}

Of course, I'd need to define something similar for console.info(), console.error(), console.warn()... etc.
I think calling console.profile() and console.profileEnd() doesn't profile worker scripts, and we can't call console.profile from within a worker.

Maybe if firebug didn't have a console object in workers it could have a 'postConsole' function? Just a thought.

*/
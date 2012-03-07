window.onload = begin;

function begin(){
	var worker = new Worker( "worker.js" );
	
	var li = document.createElement("li");
	var ul = document.getElementById("output");
	
	worker.onmessage = function( event ){
		var liclone = li.cloneNode(false);
		liclone.textContent = event.data; // event.data is what the worker postMessaged
		ul.appendChild( liclone );
	}
	
	
	// there's also a worker.onerror proptery.
	
}
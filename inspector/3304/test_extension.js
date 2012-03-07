FBL.ns(function() { with (FBL) {

/**
 * a Rep for dijit widgets. It highlights the widget's domNode when the mouse is over
 * the widget object.
 */
this.DijitRep = domplate(FirebugReps.Obj,
{
	supportsObject: function(object, type) {
		//quick (ugly) method to check if it's dijit Widget
        return object['domNode'] && object['postMixInProperties'];
    },

    highlightObject: function(widget, context) {
    	var domElem = widget['domNode'];
    	Firebug.Inspector.highlightObject(domElem, FirebugContext);
    }
    		    
});

Firebug.registerRep(this.DijitRep);

}});
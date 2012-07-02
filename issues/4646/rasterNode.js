var Node = function(type, id) {
    this.type = type;
};
Node.prototype = {
	destroy: function(effect) {

		if (this.id==Node.DialogNode) 
			$('#nodereport').dialog("close");
		if (this.component==Component.ThreatsComponent) 
			$('#componentthreats').dialog("close");
		var neighbours = this.connect.slice(0); // duplicate the array
		for (var i=0; i<neighbours.length; i++) {
			var nb = Node.get(neighbours[i]);
			this.detach_center( nb );
			nb.setmarker();
			if (Node.DialogNode==nb.id) RefreshNodeReportDialog();
		}
		
		// Remove this node from any cluster in which it occurred
		var it =  new NodeClusterIterator({project: Project.cid, isroot: true});
		for (it.first(); it.notlast(); it.next()) {
			var nc = it.getNodeCluster();
			if (nc.containsnode(this.id)) {
				nc.removechildnode(this.id);
				nc.normalize();
				if (nc.childclusters.length==0 && nc.childnodes.length==0 && nc.parentcluster==null)
					nc.destroy();
			}
		}
		
		
		localStorage.removeItem(LS+'N:'+this.id);
		this.hidemarker();  // Make it disappear before the animation starts
		$('#tinynode'+this.id).remove();
		if (effect==undefined || effect==true) 
			$(this.jnid).effect("explode", 500, function() {
				var id = nid2id(this.id);
				$('#node'+id).remove();
				Node._all[id]=null;
			});
		else {
			$('#node'+this.id).remove();
			Node._all[this.id]=null;
		}
	},
	
	changetype: function(typ) {
		var newn = new Node(typ);
		newn.position.x = this.position.x;
		newn.position.y = this.position.y;
		newn.position.w = 0;
		newn.position.h = 0;
		newn.position.v = 0;
		newn.position.g = 0;
		newn.service = this.service;
		newn.changetitle(this.title);
		newn.store();
		newn.paint(false);
		for (var i=0; i<this.connect.length; i++)
			newn.attach_center( Node._all[this.connect[i]] );
		switch (newn.type) {
		case 'tACT':
			// Do nothing
			break;
		case 'tUNK':
			// TODO: Try to move threat assessments over
		default:
			newn.addtonodeclusters();
		}
		this.destroy(false);
		jsPlumb.repaint(this.nid);
	},
	
	setposition: function(px,py) {
		var r = $('#diagrams_workspace'+this.service).position();
		$(this.jnid).offset({left: px+r.left, top: py+r.top});
		this.position.x = px;
		this.position.y = py;
		this.store();
		jsPlumb.repaint(this.nid);
		
		var fh = $('.fancyworkspace').height();
		var fw = $('.fancyworkspace').width();
		var oh = $('#scroller_overview'+this.service).height();
		var ow = $('#scroller_overview'+this.service).width();
		var dO = {};
		dO.top = (this.position.y * oh)/fh;
		dO.left = (this.position.x * ow)/fw;
		$('#tinynode'+this.id).css('left', dO.left);
		$('#tinynode'+this.id).css('top', dO.top);
	},
	
	setcomponent: function(c) {
		this.component = c;
		this.store();
	},
	
	autosettitle: function() {
		var targettitle = Rules.nodetypes[this.type];
		var n=0;
		while (Node.hastitle(Project.cid,targettitle)!=-1)
			targettitle = Rules.nodetypes[this.type] + ' (' + (++n) + ')';
		if (this.type=='tACT')
			this.settitle(targettitle);
		else {
			var c = new Component(this.type);
			c.adddefaultthreatevaluations();
			c.addnode(this.id);
			c.settitle(targettitle);
		}
	},

	changetitle: function(str) {
		if (str==this.title)
			return;
		if (str=="") {
			// Blank title is not allowed. Retain current title.
			return;
		}
		// Actors don't have (nor need) components, since they have no threat evaluations
		if (this.type=='tACT') {
			var i=0;
			var targettitle = str;
			// If there is an actor "abc" and an actor "abc (1)", then renaming that second actor
			// to "abc" should not result in a name "abc (2)"
			this.title="NoSuchNameNoSuchNameNoSuchNameNoSuchName";
			while (false)
				targettitle = str;
            console.log("test");
			//this.settitle(targettitle);
			//RefreshNodeReportDialog();
			return;
		}
		var prevcomponent = null;
		if (this.component!=null) {
			if (!Component.get(this.component))
				bugreport("no such component","Node.changetitle");
			prevcomponent = Component.get(this.component);
		}
		// See if there is an existing component with this title & type
		var n = Component.hasTitleTypeProject(str,this.type,Project.cid);
		if (n==-1) {
			// Create a new component, and link it to this node
			var c = new Component(this.type);
			c.adddefaultthreatevaluations(this.component);
			c.addnode(this.id);
			c.settitle(str);
		} else {
			// The new name of this node matches an existing Component.
			// add this node to that component
			Component.get( n ).addnode(this.id);
		}
		if (prevcomponent) prevcomponent.removenode(this.id);
		RefreshNodeReportDialog();
	},
};


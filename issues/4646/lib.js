/**
 * Copyright (c) 2006-2007, TIBCO Software Inc.
 * Use, modification, and distribution subject to terms of license.
 * 
 * TIBCO(R) PageBus 1.2.0
 */

/*******************************************************************************
 *
 * Contains an implementation of the OpenAjax Hub
 * 
 * Copyright 2006-2007 OpenAjax Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not 
 * use this file except in compliance with the License. You may obtain a copy 
 * of the License at http://www.apache.org/licenses/LICENSE-2.0 . Unless 
 * required by applicable law or agreed to in writing, software distributed 
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 *
 ******************************************************************************/

// prevent re-definition of the OpenAjax object
if(!window["OpenAjax"]){
	OpenAjax = new function() {
		var t = true;
		var f = false;
		var g = window;
		var libs;
		var ooh = "org.openajax.hub.";

		var h = {};
		this.hub = h;
		h.implementer = "http://tibco.com";
		h.implVersion = "0.6";
		h.specVersion = "0.6";
		h.implExtraData = {};
		var libs = {};
		h.libraries = libs;

		h.registerLibrary = function(prefix, nsURL, version, extra){
			libs[prefix] = {
				prefix: prefix,
				namespaceURI: nsURL,
				version: version,
				extraData: extra 
			};
			this.publish(ooh+"registerLibrary", libs[prefix]);
		}
		h.unregisterLibrary = function(prefix){
			this.publish(ooh+"unregisterLibrary", libs[prefix]);
			delete libs[prefix];
		}

		h._subscriptions = { c:{}, s:[] };
		h._cleanup = [];
		h._subIndex = 0;
		h._pubDepth = 0;

		h.subscribe = function(name, callback, scope, subscriberData, filter)			
		{
			if(!scope){
				scope = window;
			}
			var handle = name + "." + this._subIndex;
			var sub = { scope: scope, cb: callback, fcb: filter, data: subscriberData, sid: this._subIndex++, hdl: handle };
			var path = name.split(".");
	 		this._subscribe(this._subscriptions, path, 0, sub);
			return handle;
		}

		h.publish = function(name, message)		
		{
			path = name.split(".");
			this._pubDepth++;
			this._publish(this._subscriptions, path, 0, name, message);
			this._pubDepth--;				
			if((this._cleanup.length > 0) && (this._pubDepth == 0)) {
				for(var i = 0; i < this._cleanup.length; i++) 
					this.unsubscribe(this._cleanup[i].hdl);
				delete(this._cleanup);
				this._cleanup = [];
			}
		}

		h.unsubscribe = function(sub) 
		{
			var path = sub.split(".");
			var sid = path.pop();
			this._unsubscribe(this._subscriptions, path, 0, sid);
		}
		
		h._subscribe = function(tree, path, index, sub) 
		{
			var token = path[index];
			if(index == path.length) 	
				tree["."].push(sub);
			else { 
				if(!tree[token]) {
					tree[token] = { ".": [] }; 
					this._subscribe(tree[token], path, index + 1, sub);
				}
				else 
					this._subscribe(tree[token], path, index + 1, sub);
			}
		}

		h._publish = function(tree, path, index, name, msg) {
			if(typeof tree != "undefined") {
				var node;
				if(index == path.length) {
					node = tree;
				} else {
					this._publish(tree[path[index]], path, index + 1, name, msg);
					this._publish(tree["*"], path, index + 1, name, msg);			
					node = tree["**"];
				}
				if(typeof node != "undefined") {
					var callbacks = node["."];
					var max = callbacks.length;
					for(var i = 0; i < max; i++) {
						if(callbacks[i].cb) {
							var sc = callbacks[i].scope;
							var cb = callbacks[i].cb;
							var fcb = callbacks[i].fcb;
							var d = callbacks[i].data;
							if(typeof cb == "string"){
								// get a function object
								cb = sc[cb];
							}
							if(typeof fcb == "string"){
								// get a function object
								fcb = sc[fcb];
							}
							try {
								if((!fcb) || 
							   		(fcb.call(sc, name, msg, d))) {
										cb.call(sc, name, msg, d);
								}
							}
							catch(err) {
								if(err.message == "PageBus.StackOverflow")
									throw err;
								h.publish("com.tibco.pagebus.error.callbackError", { name: escape(name), error: escape(err.message) });
							}
						}
					}
				}
			}
		}
			
		h._unsubscribe = function(tree, path, index, sid) {
			if(typeof tree != "undefined") {
				if(index < path.length) {
					var childNode = tree[path[index]];
					this._unsubscribe(childNode, path, index + 1, sid);
					if(childNode["."].length == 0) {
						for(var x in childNode) 
					 		return;		
						delete tree[path[index]];	
					}
					return;
				}
				else {
					var callbacks = tree["."];
					var max = callbacks.length;
					for(var i = 0; i < max; i++) 
						if(sid == callbacks[i].sid) {
							if(this._pubDepth > 0) {
								callbacks[i].cb = null;	
								this._cleanup.push(callbacks[i]);						
							}
							else
								callbacks.splice(i, 1);
							return; 	
						}
				}
			}
		}
	};
	// Register the OpenAjax Hub itself as a library.
	OpenAjax.hub.registerLibrary("OpenAjax", "http://openajax.org/hub", "0.6", {});
}

if(!window["PageBus"]) {
PageBus = new function() {
	var version = "1.2.0";
	var D = 0;  
	var Q = []; 
	var Reg = {}; 
	var RClean = []; 
	var RD = 0; 

	_throw = function(n) { 
		throw new Error("PageBus." + n); 
	}
	
	_badName = function(n) { 
		_throw("BadName"); 
	}
	
	_fix = function(p) {
		if(typeof p == "undefined")
			return null;
		return p;
	}

	_valPub = function(name) {
		if((name == null) || (name.indexOf("*") != -1) || (name.indexOf("..") != -1) || 
			(name.charAt(0) == ".") || (name.charAt(name.length-1) == ".")) 
			_badName();
	}
	
	_valSub = function(name) {
		var path = name.split(".");
		var len = path.length;
		for(var i = 0; i < len; i++) {
			if((path[i] == "") ||
			  ((path[i].indexOf("*") != -1) && (path[i] != "*") && (path[i] != "**")))
				_badName();
			if((path[i] == "**") && (i < len - 1))
				_badName();
		}
		return path;
	}
	
	this.subscribe = function(name, scope, callback, subscriberData, filter)			
	{
		filter = _fix(filter);
		subscriberData = _fix(subscriberData);
		var path = _valSub(name);
	 	return OpenAjax.hub.subscribe(name, callback, scope, subscriberData, filter);
	}
	
	this.publish = function (name, message) {	
		_valPub(name);
		if(D > 20) 
			_throw("StackOverflow");
		Q.push({ n: name, m: message, d: (D + 1) });
		if(D == 0) {
			while(Q.length > 0) {
				var qitem = Q.shift();
				var path = qitem.n.split(".");
				try {
					D = qitem.d;
					OpenAjax.hub.publish(qitem.n, qitem.m);
					D = 0;
				}
				catch(err) {
					D = 0;
					throw(err);
				}
			}
		}
	}
	
	this.unsubscribe = function(sub) {
		try {
			OpenAjax.hub.unsubscribe(sub);
		}
		catch(err) {
			_throw("BadParameter");
		}
	}

	this.store = function(name, msg, props) {

		_store = function(tree, path, index, name, msg) {
			var tok = path[index];
			var len = path.length;
			if(typeof tree[tok]== "undefined")
				tree[tok] = {};
			var n = tree[tok];
			if(index == len - 1) {
				if(typeof n["."] != "undefined") {
					if(RD == 0) 
						delete n["."];
					else {
						n["."].v = null;
						RClean.push(n["."]);
					}
				}
				if(msg != null) 
					n["."] = { n: name, v: msg };
			}
			else {
				_store(n, path, index+1, name, msg);
				if(msg == null) {
					for(var x in n[path[index+1]]) 
	 					return;		
					if(RD == 0) 
						delete n[path[index+1]];
					else {
						RClean.push(n[path[index+1]]);
						n[path[index+1]] = null;
					}
				}
			}
		}
	
		_valPub(name);
		var path = name.split(".");
		_store(Reg, path, 0, name, msg);
		if(!props || !props.quiet)
			PageBus.publish(name, msg);
	}
	
	this.query = function(name, scope, cb, data, fcb) {

		_query = function(tree, path, idx, rSub) {
	
			function _doRCB(node, rSub) {
				var z = rSub.z;
				var cb = rSub.c;
				var d = rSub.d;
				var fcb = rSub.f;
	
				var n = node["."];
				if(!n || !n.v) 
					return true;
				if((fcb == null) || fcb.call(z, n.n, n.v, d)) 
					return cb.call(z, n.n, n.v, d);
				return true;
			}
		
			var len = path.length;
			var tok = path[idx];
			var last = (idx == len - 1)
			if(tok == "**") {
				for(tok in tree) {
					if(tok != ".") {
						if (!_doRCB(tree[tok], rSub))
							return false;
						if(!_query(tree[tok], path, idx, rSub))
							return false;
					}
				}
			}
			else if(tok == "*") {
				for(tok in tree) {
					if(tok != ".") {
						if(last) { 
							if(!_doRCB(tree[tok], rSub))
								return false;
						}
						else
							if(!_query(tree[tok], path, idx+1, rSub))
								return false;
					}
				}
			}
			else if(typeof tree[tok] != "undefined") {
				if(last) 
					return _doRCB(tree[tok], rSub);
				else
					return _query(tree[tok], path, idx+1, rSub);
			}
			return true;
		}

		if(scope == null)
			scope = window;
		var path = _valSub(name);
		var len = path.length;
		var res;
		try {
			RD++;
			var rSub = { z: scope, c: cb, d: data, f: fcb };
			res = _query(Reg, path, 0, rSub);
			RD--;	
		}
		catch(err) {
			RD--;	
			throw err;
		}
		if(RD == 0) {
			while(RClean.length > 0) {	
				var p = RClean.pop();
				delete p;
			}
		}
		if(!res)
			return;
		var subj = "com.tibco.pagebus.query.done";
		if((fcb == null) || fcb.call(scope, subj, null, data))
			cb.call(scope, subj, null, data);
	}

};
OpenAjax.hub.registerLibrary("PageBus", "http://tibco.com/PageBus", "1.2.0", {});
}

/* 
 * TIBCO(R) PageBus Sample
 * (c) 2007 TIBCO Software Inc. Use, modification, and distribution subject to terms of license.
 */

MessageMonitor = function(mmElementId) {
  this.maxHeight = 6;
  this.height = 0;
  this.cache = [];
  this.theStack = [];
  this.mmElement = document.getElementById(mmElementId);
  this.sub = window.PageBus.subscribe('**', this, this.cb, null);
}


// MessageMonitor.cb:
// Message handler callback for MessageMonitor's PageBus subscription
MessageMonitor.prototype.cb = function(subj, msg, data) {
  var msgMonitor = this.mmElement;
  var val = subj + ': ' + this.print(msg);
  if(this.height > this.maxHeight) 
    this.cache.shift();
  else 
    this.height++;
  this.cache.push('<div class="log-message">' + val + '</div>');
  var markup = '';
  for(var i = 0; i < this.height; i++) 
    markup = markup + this.cache[i];    
  msgMonitor.innerHTML = markup;
};


// MessageMonitor.start:
// Initialize the Message Monitor
MessageMonitor.prototype.start = function() {
  this.sub = window.PageBus.subscribe('**', this, this.cb, null);
}
  

// MessageMonitor.print:
// A simple pretty-printer for JavaScript objects
MessageMonitor.prototype.print = function(obj) {
    if(typeof obj == "object") {
      if(obj == null)
        return "<i>null</i>"
      if(obj instanceof Array) {
        if(obj.length == 0)
          return "[]";
        var res = "[";
        res += this.print(obj[0]);
        for(var i = 1; i < obj.length; i++)
          res += (", " + this.print(obj[i]));
        res += "]"
        return res;
      }
      for(var fun in this.theStack)
        if(this.theStack[fun] == obj)
          return("<i>(RECURSION)</i>");
      this.theStack.push(obj);
      var res = "{<ul style=\"list-style: none; padding-left: 1em; text-indent: -1em;\">";
      var first = true;
      for(f in obj) {
        if(!first) 
          res += ",</li>";
        else
          first = false;
        res += ("<li>" + f + ": " + this.print(obj[f]) );
      }
      res += "</li></ul>}";
      this.theStack.pop(obj);
      return res;
    }
    else if(typeof obj == "string")
      return ('"' + obj + '"');
    else if(typeof obj == "function") {
      return "<i>function</i>";
    }  
    else 
      return obj;
};
(function() {
if (!window.HTMLElement) {
  return;
}

var element = HTMLElement.prototype;

var capture = [
               "click",
               "mousedown",
               "mouseup",
               "mousemove",
               "mouseover",
               "mouseout"
              ];

element.setCapture = function() {
  var self = this;
  var flag = false;
  this._capture = function(event) {
    if (flag) {
      return;
    }
    flag = true;
    self.dispatchEvent(event);
    flag = false;
  };

  for (var i = 0; i < capture.length; i++) {
    window.addEventListener(capture[i], this._capture, true);
    window.captureEvents(Event[capture[i]]);
  }
};

element.releaseCapture = function() {
  for (var i = 0; i < capture.length; i++) {
    window.releaseEvents(Event[capture[i]]);
    window.removeEventListener(capture[i], this._capture, true);
  }
  this._capture = null;
};

element.attachEvent = function (name, handler) {
  if (typeof handler != "function") {
    return;
  }
  var nsName = name.replace(/^on/, "");
  var nsHandler = function(event) {
    window.event = event;
    handler();
    window.event = null;
  };
  handler[name] = nsHandler;
  this.addEventListener(nsName, nsHandler, false);
};

element.detachEvent = function (name, handler) {
  if (typeof handler != "function") {
    return;
  }
  var nsName = name.replace(/^on/, "");
  this.removeEventListener(nsName, handler[name], false);
  handler[name] = null;
};

var getClientWidth = function() {
  return this.offsetWidth-20;
};

var getClientHeight = function() {
  return this.offsetHeight - 20;
};

element.__defineGetter__("clientWidth", getClientWidth);
element.__defineGetter__("clientHeight", getClientHeight);

var getRuntimeStyle = function() {
  return this.style;
};

element.__defineGetter__("runtimeStyle", getRuntimeStyle);

var cs = ComputedCSSStyleDeclaration.prototype;

cs.__defineGetter__("paddingTop",
                    function() {
                      return this.getPropertyValue("padding-top");
                    }
                   );

var getCurrentStyle = function() {
  return document.defaultView.getComputedStyle(this, "");
};

element.__defineGetter__("currentStyle", getCurrentStyle);

var setOuterHtml = function(s) {
  var range = this.ownerDocument.createRange();
  range.setStartBefore(this);
  var fragment = range.createContextualFragment(s);
  this.parentNode.replaceChild(fragment, this);
};

element.__defineSetter__("outerHTML", setOuterHtml);

element.__defineSetter__("innerText",
                         function (sText) {
                           var s = "" + sText;
                           this.innerHTML = s.replace(/\&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                         }
                        );
// Emulate IE's innerText (read)
element.__defineGetter__("innerText",
                         function () {
                           function scrapTextNodes(oElem) {
                             var s = "";
                             for(var i=0;i<oElem.childNodes.length;i++) {
                               var oNode = oElem.childNodes[i];
                               if (oNode.nodeType == 3) {
                                 s += oNode.nodeValue;
                               } else if(oNode.nodeType == 1) {
                                 s += "\n" + scrapTextNodes(oNode);
                               }
                             }
                             return s;
                           }
                           return scrapTextNodes(this);
                         }
                        );

})();

(function() {
if (!window.Event) {
  return;
}

var event = Event.prototype;

if (!event) {
  return;
}

var getSrcElement = function() {
  return (this.target.nodeType==3) ? this.target.parentNode : this.target;
};

event.__defineGetter__("srcElement", getSrcElement);

var setReturnValue = function(value) {
  if (!value) {
    this.preventDefault();
  }
};

event.__defineSetter__("returnValue", setReturnValue);

})();

(function() {
if (!window.CSSStyleSheet) {
  return;
}

var stylesheet = CSSStyleSheet.prototype;

stylesheet.addRule = function(selector, rule) {
  this.insertRule(selector+"{"+rule+"}", this.cssRules.length);
};

stylesheet.__defineGetter__("rules",
                            function() {
                              return this.cssRules;
                            }
                           );
})();

(function() {

if (!window.XMLHttpRequest) {
  return;
}

var ActiveXObject = function(type) {
  ActiveXObject[type](this);
};

ActiveXObject["MSXML2.DOMDocument"] = function(obj) {
  obj.setProperty = function() {
  };
  obj.load = function(url) {
    var xml = this;
    var async = this.async ? true : false;
    var request = new XMLHttpRequest();
    request.open("GET", url, async);
    request.overrideMimeType("text/xml");
    if (async) {
      request.onreadystatechange = function() {
        xml.readyState = request.readyState;
        if (request.readyState == 4) {
          xml.documentElement = request.responseXML.documentElement;
          xml.firstChild = xml.documentElement;
          request.onreadystatechange = null;
        }
        if (xml.onreadystatechange) {
          xml.onreadystatechange();
        }
      };
    }

    this.parseError = {
      errorCode: 0,
      reason: "Emulation"
    };

    request.send(null);
    this.readyState = request.readyState;
    if (request.responseXML && !async) {
      this.documentElement = request.responseXML.documentElement;
      this.firstChild = this.documentElement;
    }
  };
};

ActiveXObject["MSXML2.XMLHTTP"] = function(obj) {
  obj.open = function(method, url, async) {
    this.request = new XMLHttpRequest();
    this.request.open(method, url, async);
  };

  obj.send = function(data) {
    this.request.send(data);
  };

  obj.setRequestHeader = function(name, value) {
    this.request.setRequestHeader(name, value);
  };

  obj.__defineGetter__("readyState",
                       function() {
                         return this.request.readyState;
                       }
                      );
  obj.__defineGetter__("responseXML",
                       function() {
                         return this.request.responseXML;
                       }
                      );
  obj.__defineGetter__("responseText",
                       function() {
                         return this.request.responseText;
                       }
                      );
};

})();

(function() {

if (!window.XPathEvaluator) {
  return;
}

var xpath = new XPathEvaluator();

var element = Element.prototype;
var attribute = Attr.prototype;
var doc = Document.prototype;

doc.loadXML = function(text) {
  var parser = new DOMParser();
  var newDoc = parser.parseFromString(text, "text/xml");
  this.replaceChild(newDoc.documentElement, this.documentElement);
};

// Emulate IE's xml property
doc.__defineGetter__("xml",
                     function() {
                       return (new XMLSerializer()).serializeToString(this);
                     }
                    );

doc.setProperty = function(name, value) {
  if (name == "SelectionNamespaces") {
    namespaces = {
    };
    var a = value.split(" xmlns:");
    for (var i = 1; i < a.length; i++) {
      var s = a[i].split("=");
      namespaces[s[0]] = s[1].replace(/\"/g, "");
    }
    this._ns = {
      lookupNamespaceURI : function(prefix) {
        return namespaces[prefix];
      }
    };
  }
};

doc._ns = {
  lookupNamespaceURI : function() {
    return null;
  }
};

//=============================================================
// XSLT Section: transformNodeToObject, transformNode
//=============================================================
// Emulate IE's transformNodeToObject() method
doc.transformNodeToObject = function(xslDoc, oResult) {
  var xsltProcessor = new XSLTProcessor();
  try {
    if (xsltProcessor.reset) {
      // new nsIXSLTProcessor is available
      xsltProcessor.importStylesheet(xslDoc);
      var newFragment = xsltProcessor.transformToFragment(this, document);
      /*
      while (oResult.hasChildNodes()) {
        oResult.removeChild(oResult.firstChild);
      }
      // importNode is not yet needed in Moz due to a bug but it will be
      // fixed so...
      var oNodes = newFragment.childNodes;
      var l = oNodes.length;
      for(i = 0; i < l; i++) {
        oResult.appendChild(oResult.importNode(oNodes[i], true));
        } */
      return (newFragment);
    } else {
      // only nsIXSLTProcessorObsolete is available
      xsltProcessor.transformDocument(this, xslDoc, oResult, null);
    }
  } catch(e) {
    throw(e);
  }
};

// Emulate IE's transformNode() method
doc.transformNode = function(xslDoc) {
  var out = document.implementation.createDocument("", "", null);
  var oResult = this.transformNodeToObject(xslDoc, out);
  var serializer = new XMLSerializer();
  try {
    var str = serializer.serializeToString(oResult);
  } catch(e) {
    throw(e);
  }
  return str;
};

doc.selectNodes = function (path) {
  var result = xpath.evaluate(path, this, this._ns, 7, null);
  var i, nodes = [];
  for (i = 0; i < result.snapshotLength; i++) {
    nodes[i] = result.snapshotItem(i);
  }
  return nodes;
};

doc.selectSingleNode = function (path) {
  return xpath.evaluate(path, this, this._ns, 9, null).singleNodeValue;
};

element.selectNodes = function (path) {
  var result = xpath.evaluate(path, this, this.ownerDocument._ns, 7, null);
  var i, nodes = [];
  for (i = 0; i < result.snapshotLength; i++) {
    nodes[i]=result.snapshotItem(i);
  }
  return nodes;
};

element.selectSingleNode = function (path) {
  return xpath.evaluate(path, this, this.ownerDocument._ns, 9, null).singleNodeValue;
};

element.__defineGetter__("text",
                         function() {
                           return this.firstChild.nodeValue;
                         }
                        );
attribute.__defineGetter__("text",
                           function() {
                             return this.nodeValue;
                           }
                          );
})();
gecko = navigator.product == "Gecko";
msie = /msie/i.test(navigator.userAgent);
msie70 = msie && navigator.appVersion.indexOf("MSIE 7.0") >= 0;
msie80 = msie && navigator.appVersion.indexOf("MSIE 8.0") >= 0;
startUpWorkInProgress = false;
progressDialog = true;
developByFigaro = true && ((window.location.host == 'localhost:7001' || window.location.host == '192.168.2.229:8888')  || (window.location.host == 'localhost:8081') || (window.location.host == 'localhost:8080' || window.location.host == '192.168.170.1:8080'));
oneColSettings = false;
twoRowsSettings = true;

_objuid = 0;

function msieversion()
// From MSDN site...
// Return Microsoft Internet Explorer (major) version number, or 0 for others.
// This function works by finding the "MSIE " string and extracting the version number
// following the space, up to the semicolon
{
    var ua = window.navigator.userAgent
    var msie = ua.indexOf ( "MSIE " )

    if ( msie > 0 )        // is Microsoft Internet Explorer; return version number
        return parseFloat ( ua.substring ( msie+5, ua.indexOf ( ";", msie ) ) )
    else
        return 0    // is other browser
}

function clearNodeList(node) {
  var childs = node.childNodes;
  var l = childs.length;
  for (var i = 0; i < l; i++) {
    var child = childs.item(i);
    if (typeof (child) != 'undefined') {
      if (typeof (child.nodeType) != 'undefined') {
        if (child.nodeType == 1) { // Node.ELEMENT_NODE
          clearNodeList(child);
          child.onclick = null;
          child.onfocus = null;
          child.onblur = null;
          child.onmouseover = null;
          child.onmouseout = null;
          child.onmousedown = null;
          child.onmousemove = null;
          child.onmouseup = null;
          child.onselectstart = null;
          child.onbeforedeactivate = null;
          child.onchange = null;
          child.onkeydown = null;
          child.onscroll = null;
          child.gazda = null;
          child.hovers = null;
          child.removeAttribute('gazda');
          child.removeAttribute('hovers');
          if (typeof (child.jsObject) != 'undefined') {
            try {
              child.jsObject.dispose();
            } catch (ex) {
              // dummy
            }
            child.jsObject = null;
            child.removeAttribute('jsObject');
          }
        }
      }
    }
  }
}

function clearNodeListSlow(node) {
  var childs = node.childNodes;
  var l = childs.length;
  for (var i = 0; i < l; i++) {
    var child = childs.item(i);
    if (typeof (child) != 'undefined') {
      if (typeof (child.nodeType) != 'undefined') {
        if (child.nodeType == 1) { // Node.ELEMENT_NODE
          clearNodeList(child);
          for (var a in child) {
            try {
              if (a.substring(0, 2) == 'on') {
                child[a] = null;
              } else {
                if (a == 'jsObject') {
                  // alert("disp-ID:"+child.id+"-"+child.nodeName+"="+child.nodeType);
                  child[a].dispose();
                  child[a] = null;
                } else {
                  if (a == 'gazda') {
                    child[a] = null;
                  }
                }
              }
            } catch (ex) {
              alert("Error:"+ex.message+":::"+a);
            }
          }
        }
      }
    }
  }
}

if (msie && !msie70) {
  function reDrawWindow(){
    try {
      window.showModelessDialog("javascript:window.close()", window, 'dialogHeight:200px;dialogWidth:150px;status:0');
      // window.showModelessDialog("javascript:document.writeln('<" + "script" + ">window.close();</" + "script" + ">')", window, 'dialogHeight:200px;dialogWidth:150px;status:0');
    } catch (ex) {
      //
    }
  }
} else {
  function reDrawWindow(){
  }
}

if (startUpWorkInProgress) {
  try {
    var startUpWorkInProgressPopUp = window.open('', 'WorkInProgress', 'height=100, width=100, menubar=0, resizable=0, scrollbars=0, status=0,titlebar=0,toolbar=0');
    startUpWorkInProgressPopUp.document.open("text/html");
    startUpWorkInProgressPopUp.document.writeln("<html><body>");
    startUpWorkInProgressPopUp.document.writeln("Alkalmazás letöltése folyamatban...");
    startUpWorkInProgressPopUp.document.writeln("</body></html>");
    startUpWorkInProgressPopUp.document.close();
  } catch (exc) {
  }
}

function isUndef(o) {
  return (typeof(o) == 'undefined');
}

if (gecko) {
  //JSCL.js-t nem fog base-nek találni, ezért belekerül az URL-be, hogy undefined és elromlik.
  //Ez a js amúgy is benne van a jawr bundle-ban, úh. ez az import felesleges.
  //$import("JSCL.js", "JSCL.Browser.Compatibility.Gecko.js");
}

if (startUpWorkInProgress) {
  try {
    startUpWorkInProgressPopUp.close();
  } catch (exc) {
  }
}

function $() {
  var elements = [];
  var l = arguments.length;
  for (var i = 0; i < l; i++) {
    var element = arguments[i];
    if (typeof element == 'string') {
      element = document.getElementById(element);
    }
    if (l == 1) {
      return element;
    }
    elements.push(element);
  }
  return elements;
}
/*
 Try is provided as a way of testing a series of items and returning the first one that doesn't throw an error.

 Try provides the these() function.

 getTransport: function() {
   return Try.these(
     function() {return new ActiveXObject('Msxml2.XMLHTTP')},
     function() {return new ActiveXObject('Microsoft.XMLHTTP')},
     function() {return new XMLHttpRequest()}
   ) || false;
 }
*/

var Try = {
these: function() {
  var returnValue;
  var l = arguments.length;
  for (var i = 0; i < l; i++) {
    var lambda = arguments[i];
    try {
      returnValue = lambda();
      break;
    } catch (e) {
      // logger.debug(i+". "+e.message);
    }
  }
  return returnValue;
},
theseNames: function() {
  var returnValue;
  var l = arguments.length;
  for (var i = 0; i < l; i++) {
    var lambda = arguments[i];
    try {
      returnValue = lambda();
      returnValue = lambda;
      break;
    } catch (e) {
      // logger.debug(i+". "+e.message);
    }
  }
  return returnValue;
},
theseActiveX: function() {
  var returnValue = '';
  var l = arguments.length;
  for (var i = 0; i < l; i++) {
    var lambda = arguments[i];
    try {
      returnValue = new ActiveXObject(lambda.name);
      returnValue = lambda.value;
      break;
    } catch (e) {
      // logger.debug(i+". "+e.message);
    }
  }
  return returnValue;
}
};

// See http://support.microsoft.com/default.aspx?scid=KB;EN-US;Q285081&ID=KB;EN-US;Q285081 if you have troubles!
//     http://support.microsoft.com/kb/269238/EN-US/
getTransport = function() {
  return Try.these(
    function() {return new ActiveXObject('Msxml2.XMLHTTP.6.0')},
    function() {return new ActiveXObject('Msxml2.XMLHTTP.5.0')},
    function() {return new ActiveXObject('Msxml2.XMLHTTP.4.0')},
    function() {return new ActiveXObject('Msxml2.XMLHTTP.3.0')},
    function() {return new ActiveXObject('Msxml2.XMLHTTP')},
    function() {return new ActiveXObject('Microsoft.XMLHTTP')},
    function() {return new XMLHttpRequest()}
  ) || false;
}

createIEDocument = function() {
  return Try.these(
    function() {return new ActiveXObject('Msxml2.DOMDocument.6.0')},
    function() {return new ActiveXObject('Msxml2.DOMDocument.5.0')},
    function() {return new ActiveXObject('Msxml2.DOMDocument.4.0')},
    function() {return new ActiveXObject('Msxml2.DOMDocument.3.0')},
    function() {return new ActiveXObject('Msxml2.DOMDocument')},
    // function() {return new ActiveXObject('Msxml.DOMDocument')},
    function() {return new ActiveXObject('Microsoft.XMLDOM')}
  ) || false;
}

getIEDocumentName = function() {
  return Try.theseActiveX(
    {name: 'Msxml2.DOMDocument.6.0', value: 'Msxml2.DOMDocument.6.0'},
    {name: 'Msxml2.DOMDocument.5.0', value: 'Msxml2.DOMDocument.5.0'},
    {name: 'Msxml2.DOMDocument.4.0', value: 'Msxml2.DOMDocument.4.0'},
    {name: 'Msxml2.DOMDocument.3.0', value: 'Msxml2.DOMDocument.3.0'},
    {name: 'Msxml2.DOMDocument', value: 'Msxml2.DOMDocument'},
    // {name: 'Msxml.DOMDocument', value: 'Msxml.DOMDocument'},
    {name: 'Microsoft.XMLDOM', value: 'Microsoft.XMLDOM'}
  ) || "NoXml";
}

getIEDocumentDiff = function() {
  return Try.theseActiveX(
    {name: 'Msxml2.DOMDocument.6.0', value: 0},
    {name: 'Msxml2.DOMDocument.5.0', value: 0},
    {name: 'Msxml2.DOMDocument.4.0', value: 0},
    {name: 'Msxml2.DOMDocument.3.0', value: 1},
    {name: 'Msxml2.DOMDocument', value: 1},
    // {name: 'Msxml.DOMDocument', value: 1},
    {name: 'Microsoft.XMLDOM', value: 1}
  ) || 0;
}

function $import(src, path){
  var i, base, scripts = document.getElementsByTagName("script");
  for (i = 0; i < scripts.length; i++) {
    if (scripts[i].src.match(src)) {
      base = scripts[i].src.replace(src, "");
      break;
    }
  }
  document.write("<"+"script src=\""+base+path+"\"></"+"script>");
}

function getXmlAsString(rootXml) {
  try {
    if (typeof XMLSerializer != "undefined") {
      return (new XMLSerializer().serializeToString(rootXml));
    } else {
      var xmlNode;
      if (rootXml.documentElement) {
        xmlNode = rootXml.documentElement;
      } else {
        xmlNode = rootXml;
      }
      if (xmlNode.xml) {
        return (xmlNode.xml);
      } else {
        return (xmlNode.innerHTML);
      }
    }
  } catch (E) {
    alert(E.message);
  }
  return ("<>");
}

function kiment(rootXml) {
  // return ;
  logger.debug(getXmlAsString(rootXml));
}

function cMyDump(aText) {
  // return ;
  logger.debug(aText);
}

function addAttribute(node, attr, value) {
  // node.setAttribute(attr, value);
	try {
	  var lAttr = document.createAttribute(attr);
	  lAttr.value = value;
	  node.setAttributeNode(lAttr);
	} catch (ex) {
	  logger.debug("Error in addAttribute while setting attr = " + attr + ", value = " + value);
	}
}

function addE(o, t, fn) {
  if (o.addEventListener) {
    o.addEventListener(t , fn, true);
    return true;
  } else {
    if (o.attachEvent) {
      var addEvnRt = o.attachEvent("on"+t, fn);
      return addEvnRt;
    }
  }
}

function TextToXml(src) {
  var xml;
  if (msie) {
    xml = createIEDocument();
    xml.async = "false";
    xml.loadXML(src);
  } else {
    xml = (new DOMParser()).parseFromString(src, 'text/xml');
  }
  return (xml.documentElement);
}

var keyStr = "ABCDEFGHIJKLMNOP" +
"QRSTUVWXYZabcdef" +
"ghijklmnopqrstuv" +
"wxyz0123456789+/" +
"=";

function encode64(input) {
  var output = "";
  var chr1, chr2, chr3 = "";
  var enc1, enc2, enc3, enc4 = "";
  var i = 0;

  do {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output = output +
      keyStr.charAt(enc1) +
      keyStr.charAt(enc2) +
      keyStr.charAt(enc3) +
      keyStr.charAt(enc4);
    chr1 = chr2 = chr3 = "";
    enc1 = enc2 = enc3 = enc4 = "";
  } while (i < input.length);

  return output;
}

function decode64(input) {
  var output = "";
  var chr1, chr2, chr3 = "";
  var enc1, enc2, enc3, enc4 = "";
  var i = 0;

  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  var base64test = /[^A-Za-z0-9\+\/\=]/g;
  if (base64test.exec(input)) {
    alert("There were invalid base64 characters in the input text.\n" +
          "Valid base64 characters are A-Z, a-z, 0-9, '+', '/', and '='\n" +
          "Expect errors in decoding.");
  }
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 != 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 != 64) {
      output = output + String.fromCharCode(chr3);
    }

    chr1 = chr2 = chr3 = "";
    enc1 = enc2 = enc3 = enc4 = "";

  } while (i < input.length);

  return output;
}

function figyelem() {
  alert("Figyelem");
}

function addStyledText(szulo, szoveg, stilus) {
  var embDiv = document.createElement("SPAN");
  var classDef = "addedTexts "+(isUndef(stilus) ? '' : stilus);
  embDiv.className = classDef;
  embDiv.appendChild(document.createTextNode(szoveg));
  szulo.appendChild(embDiv);
}

function addTextMezo(tTr, szoveg, stilus) {
  var tTd = document.createElement("TD");
  tTr.appendChild(tTd);
  addStyledText(tTd, szoveg, stilus);
}

function showhide(id) {
  var xpos, ypos;
  state = 'unknown';
  if (window.innerHeight) {
    xpos=window.pageXOffset;
    ypos=window.pageYOffset;
  } else if (document.body) {
    xpos=document.body.scrollLeft;
    ypos=document.body.scrollTop;
  }
  if (document.layers) {
    if (document.layers[id].display == "none") {
      document.layers[id].display = "block";
      state = 'visible';
    } else if (document.layers[id].display == "block") {
      document.layers[id].display = "none";
      state = 'hidden';
    }
  } else {
    if (document.getElementById(id).style.display == "none") {
      document.getElementById(id).style.display = "block";
      state = 'visible';
    } else if (document.getElementById(id).style.display == "block") {
      document.getElementById(id).style.display = "none";
      state = 'hidden';
    }
  }
  window.scroll(xpos,ypos);
  return state;
}

function getGridHeight(difference) {
  var gridHeight = 380;
  switch (screen.availWidth) {
    case 800:
      gridHeight = 230;
      break;
    case 1024:
      gridHeight = 380;
      break;
    case 1680:
      gridHeight = 662;
      break;
    default:
      gridHeight = 380;
      break;
  }
  return (gridHeight+difference);
}

function openNewApplicationWindow(mainCommand, ejrSystem, ejrApplication) {
    var targetWindow = ejrSystem;
    var params = 'status=yes,titlebar=yes,menubar=no,location=no,scrollbars=yes,resizable=yes,toolbar=no,left=0,top=0,fullscreen=no';
    params = params+',height='+screen.availHeight;
    params = params+',width='+screen.availWidth;
    window.open('Command?cmd='+mainCommand+'&width='+screen.availWidth+'&height='+screen.availHeight+'&ejrSystem='+ejrSystem+'&ejrApplication='+ejrApplication, targetWindow, params);
}

function setDisabledCSS(e, isDisabled) {
  if(!isDisabled) {
	  e.className = e.className.replace(/ring-disabled/,'');
	  e.className = e.className.replace(/ring-enabled/,'');
	  e.className += " ring-enabled";
  } else {
	  e.className = e.className.replace(/ring-enabled/,'');
	  e.className = e.className.replace(/ring-disabled/,'');
	  e.className += " ring-disabled";
  }
}
Array.prototype.Add = function(o){ this.push(o) } ;
Array.prototype.BinarySearch = function(key, fn) {
	var arr = ([].concat(this)).sort((fn?fn:'')) ;
	var low = -1 ;
	var high = arr.length ;
	var i ;
	while ((high - low) > 1) {
		i = ((low + high) >>> 1) ;
		if (key <= arr[i]) high = i ;
		else low = i ;
	}
	if (key == arr[high]) return high ;
	return -1 ;
} ;
Array.prototype.Clear = function() { this.splice(0, this.length) ; } ;
Array.prototype.Contains = function(o) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == o) return true ;
	}
	return false ;
} ;
Array.prototype.IndexOf = function(o) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == o) return i ;
	}
	return -1 ;
} ;
Array.prototype.Insert = function(i, o) { this.splice(i,0,o) ; } ;
Array.prototype.Item = function(k){ return this[k] ; } ;
Array.prototype.Remove = function(o) {
	var i = this.IndexOf(o) ;
	if (i >= 0) this.splice(i,1) ;
} ;
Array.prototype.RemoveAt = function(i) { this.splice(i,1) ; } ;
Date.FormatTypes = { ShortDate:0, LongDate:1, ShortEuroDate:2, LongEuroDate:3, Numeric:4, NumericEuro:5, Time:6, TimeMilitary:7, ODBC:8, XSD:9 } ; 
Date.prototype.GetDayOfWeekName = function() { return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][this.getDay()] ; }
Date.prototype.GetDayOfWeekShortName = function() { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][this.getDay()] ; }
Date.prototype.GetMonthName = function() { return ["January","February","March","April","May","June","July","August", "September","October","November","December"][this.getMonth()] ; } ;
Date.prototype.GetMonthShortName = function() { return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug", "Sep","Oct","Nov","Dec"][this.getMonth()] ; } ;
Date.prototype.GetHumanDateString = function() { return this.getMonthName() + " " + this.getDate() + ", " + this.getFullYear() ; } ;
Date.prototype.GetShortHumanDateString = function(delim) { 
	if (!delim) var delim = "-" ; 
	return this.getMonthShortName() + delim + this.getDate() + delim + this.getYear() ; 
} ;
Date.prototype.GetShortDateString = function(delim) {
	if (!delim) var delim = "-" ; 
	return (this.getMonth()+1) + delim + this.getDate() + delim + this.getYear() ; 
} ;
Date.prototype.GetHumanTimeString = function() {
	var h = this.getHours() ;
	var m = "00" + this.getMinutes() ;
	var t = h >= 12 ? "pm" : "am" ;
	if (h == 0) h = 24 ;
	if (h > 12) h -= 12 ;
	return h + ":" + m.substr(-2,2) + " " + t ;
} ;
Date.prototype.Format = function(FormatType) {
	switch (FormatType) {
		case Date.FormatTypes.ShortDate : return this.GetShortHumanDateString() ;
		case Date.FormatTypes.LongDate : return this.GetHumanDateString() ;
		case Date.FormatTypes.ShortEuroDate : return this.getDate() + "-" + this.GetMonthShortName() + "-" + this.getYear() ;
		case Date.FormatTypes.LongEuroDate : return this.getDate() + " " + this.GetMonthName() + " " + this.getFullYear() ;
		case Date.FormatTypes.Numeric : return (this.getMonth()+1) + "-" + this.getDate() + "-" + this.getYear() ;
		case Date.FormatTypes.NumericEuro : return this.getDate() + "-" + (this.getMonth()+1) + "-" + this.getYear() ;
		case Date.FormatTypes.Time : return this.GetHumanTimeString() ;
		case Date.FormatTypes.TimeMilitary : {
			var h = '00' + this.getHours() ;
			var m = '00' + this.getMinutes() ;
			return h.substr(-2,2) + ':' + m.substr(-2,2) ;
		}
		case Date.FormatTypes.ODBC : {
			var m = '00' + (this.getMonth() + 1) ;
			var d = '00' + this.getDate() ;
			var h = '00' + this.getHours() ;
			var mn = '00' + this.getMinutes() ;
			var s = '00' + this.getSeconds() ;
			return this.getFullYear() + '-' + m.substr(-2,2) + '-' + d.substr(-2,2) + ' ' + h.substr(-2,2) + ':' + mn.substr(-2,2) + ':' + s.substr(-2,2) ;
		}
		case Date.FormatTypes.XSD : {
			var m = '00' + (this.getUTCMonth() + 1) ;
			var d = '00' + this.getUTCDate() ;
			var h = '00' + this.getUTCHours() ;
			var mn = '00' + this.getUTCMinutes() ;
			var s = '00' + this.getUTCSeconds() ;
			return this.getUTCFullYear() + '-' + m.substr(-2,2) + '-' + d.substr(-2,2) + ' ' + h.substr(-2,2) + ':' + mn.substr(-2,2) + ':' + s.substr(-2,2) + 'Z' ;
		} 
		default : return this.toString() ;
	}
} ;
Date.CompareTypes = { Default:0, Date:1, Time:2 } ;
Date.prototype.Compare = function(dateToCompareTo, options) {
	if (!dateToCompareTo) var dateToCompareTo = new Date() ;
	if (!options) var options = Date.CompareTypes.Date | Date.CompareTypes.Time ;
	var d1 = new Date(
		((options & Date.CompareTypes.Date)?(this.getFullYear()):(new Date().getFullYear())) , 
		((options & Date.CompareTypes.Date)?(this.getMonth()):(new Date().getMonth())) , 
		((options & Date.CompareTypes.Date)?(this.getDate()):(new Date().getDate())) , 
		((options & Date.CompareTypes.Time)?(this.getHours()):0) , 
		((options & Date.CompareTypes.Time)?(this.getMinutes()):0) , 
		((options & Date.CompareTypes.Time)?(this.getSeconds()):0)
	) ;
	var d2 = new Date(
		((options & Date.CompareTypes.Date)?(dateToCompareTo.getFullYear()):(new Date().getFullYear())) , 
		((options & Date.CompareTypes.Date)?(dateToCompareTo.getMonth()):(new Date().getMonth())) , 
		((options & Date.CompareTypes.Date)?(dateToCompareTo.getDate()):(new Date().getDate())) , 
		((options & Date.CompareTypes.Time)?(dateToCompareTo.getHours()):0) , 
		((options & Date.CompareTypes.Time)?(dateToCompareTo.getMinutes()):0) , 
		((options & Date.CompareTypes.Time)?(dateToCompareTo.getSeconds()):0)
	) ;
	if (d1.getTime() > d2.getTime()) return 1 ;
	if (d1.getTime() < d2.getTime()) return -1 ;
	return 0 ;
} ;
Date.AddUnits = { Year:0,Month:1,Day:2,Hour:3,Minute:4,Second:5,Millisecond:6 } ;
Date.prototype.Add = function(unit, n) {
	if (!unit) throw new Error("Date.Add(): you must specify the unit you wish to use for addition.") ;
	if (!n) var n = 1 ;
	switch (unit) {
		case Date.AddUnits.Year : return new Date(this.getFullYear()+n, this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()) ;
		case Date.AddUnits.Month : return new Date(this.getFullYear(), this.getMonth()+n, this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()) ;
		case Date.AddUnits.Day : return new Date(this.getFullYear(), this.getMonth(), this.getDate()+n, this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()) ;
		case Date.AddUnits.Hour : return new Date(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours()+n, this.getMinutes(), this.getSeconds(), this.getMilliseconds()) ;
		case Date.AddUnits.Minute : return new Date(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes()+n, this.getSeconds(), this.getMilliseconds()) ;
		case Date.AddUnits.Second : return new Date(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds()+n, this.getMilliseconds()) ;
		case Date.AddUnits.Millisecond : return new Date(this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()+n) ;
		default : return new Date(this.getFullYear(), this.getMonth(), this.getDate()+n, this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()) ;
	}
} ;
Function.prototype.Parse = function() {
	var o = {}, s = this.toString() ;
	o.Parameters = ((s.substring(s.indexOf('(')+1, s.indexOf(')'))).replace(/\s+/g, "")).split(",") ;
	o.Body = (s.substring(s.indexOf('{')+1, s.lastIndexOf('}'))).replace(/(^\s*)|(\s*$)/g, "") ;
	return o ;
} ;

Function.prototype.closure = function(obj) {
  // Init object storage.
  if (!window.__objs) {
    window.__objs = [];
    window.__funs = [];
  }
  // For symmetry and clarity.
  var fun = this;
  // Make sure the object has an id and is stored in the object store.
  var objId = obj.__objId;
  if (!objId) {
    __objs[objId = obj.__objId = __objs.length] = obj;
  }
  // Make sure the function has an id and is stored in the function store.
  var funId = fun.__funId;
  if (!funId) {
    __funs[funId = fun.__funId = __funs.length] = fun;
  }
  // Init closure storage.
  if (!obj.__closures) {
    obj.__closures = [];
  }
  // See if we previously created a closure for this object/function pair.
  var closure = obj.__closures[funId];
  if (closure) {
    return closure;
  }
  // Clear references to keep them out of the closure scope.
  obj = null;
  fun = null;
  // Create the closure, store in cache and return result.
  return __objs[objId].__closures[funId] = function () {
    return __funs[funId].apply(__objs[objId], arguments);
  };
};
Math.RoundToPlaces = function(n, p) { return Math.round(n*Math.pow(10,p))/Math.pow(10,p) ; } ;
Math.DegreesToRadians = function(x) { return (x * Math.PI) / 180 ; } ;
Math.RadiansToDegrees = function(x) { return (x * 180) / Math.PI ; } ;
Math.Factorial = function(n) {
	if(n < 1) return 0;
	var retVal = 1;
	for (var i = 1; i <= n; i++) retVal *= i ;
	return retVal ;
} ;
Math.Permutations = function(n, k) {
	if(n == 0 || k == 0) return 1 ;
	return (Math.Factorial(n) / Math.Factorial(n - k)) ;
} ;
Math.Combinations = function(n, r) {
	if( n==0 || r==0 ) return 1 ;
	return (Math.Factorial(n) / (Math.Factorial(n - r) * Math.Factorial(r))) ;
} ;
Math.Bernstein = function (t, n, i) {
	return (Math.combinations(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i)) ;
} ;
Math.Random = function(maximum, minimum, floating) {
	var M, m, r;
	m = minimum || 0;
	M = maximum - m;
	r = Math.random()*M + m;
	if(floating) r = r>maximum ? maximum : r;
	else r = Math.round(r);
	return r;
} ;
Math.InPolygon = function(poly, px, py) {
	 var npoints = poly.length ;
	 var xnew, ynew, xold, yold, x1, y1, x2, y2 ;
	 var inside = false ;

	 if (npoints/2 < 3) return false;
	 xold = poly[npoints - 2] ;
	 yold = poly[npoints - 1] ;
	 
	 for (var i = 0 ; i < npoints ; i = i + 2) {
		  xnew=poly[i] ;
		  ynew=poly[i + 1] ;
		  if (xnew > xold) {
			   x1 = xold ;
			   x2 = xnew ;
			   y1 = yold ;
			   y2 = ynew ;
		  } else {
			   x1 = xnew ;
			   x2 = xold ;
			   y1 = ynew ;
			   y2 = yold ;
		  }
		  if ((xnew < px) == (px <= xold) && ((py-y1)*(x2-x1) < (y2-y1)*(px-x1))) inside = !inside ;
		  xold = xnew ;
		  yold = ynew ;
	 }
	 return inside;		
} ;
Object.GetType = function(o) {
  return o.constructor;
};
Object.IsInstanceOf = function(o1, o2) {
  return (Object.GetType(o1) == o2);
};
Object.IsSubTypeOf = function(o1, o2) {
  return (o1 instanceof o2);
};

Object.IsBaseTypeOf = function(o1, o2) {
  return (o2 instanceof o1);
};

Object.TypeExists = function(s) {
  var parts = s.split("."), i = 0, obj = window;
  do { obj = obj[parts[i++]] ; } while (i < parts.length && obj);
  return (obj && obj != window);
};
Object.CreateFromType = function(s, args) {
  if (!Object.TypeExists(s)) {
    throw new Exception("Object.CreateFromType('" + s + "'): Type does not exist.");
  }
  var parts = s.split("."), i = 0, obj = window;
  do { obj = obj[parts[i++]] ; } while (i < parts.length && obj);
  var o = {};
  obj.apply(o, args);
  return o;
};

Object.addProperty = function (o, sType, sName, vValue) {
  if (typeof vValue != sType) {
    alert("Property "+sName+" must be of type "+sType+".");
    return;
  }
  o[sName] = vValue;
  var sFuncName = sName.charAt(0).toUpperCase()+sName.substring(1, sName.length);
  o["get"+sFuncName] = function () {
    return o[sName]
  };
  o["set"+sFuncName] = function (vNewValue) {
    if (typeof vNewValue != sType) {
      alert("Property "+sName+" must be of type "+sType+".");
      return;
    }
    var vOldValue = o["get"+sFuncName]();
    var oEvent = {
      propertyName : sName,
        propertyOldValue : vOldValue,
        propertyNewValue : vNewValue,
        returnValue : true
    };
    o.onpropertychange(oEvent);
    if (oEvent.returnValue) {
      o[sName] = oEvent.propertyNewValue;
    }
  };
}
String.FormatTypes = { Date:0, DateTime:1, ShortDate:2, Time:3, PostalCode:4, Phone:5, Currency:6, Email:7 };
String.EscapeTypes = { Database:0 , URI:1 , Script:2, URIComponent:3, Rate:4 };

String.prototype.repeat = function (n) {
  var s = "", t = this + s;
  while (--n >= 0) {
    s += t;
  }
  return s;
}

String.prototype.stripTags = function() {
  return this.replace(/<\/?[^>]+>/gi, '');
}

String.prototype.escapeHTML = function() {
  var div = document.createElement('div');
  var text = document.createTextNode(this);
  div.appendChild(text);
  return div.innerHTML;
}

String.prototype.unescapeHTML = function() {
  var div = document.createElement('div');
  div.innerHTML = this.stripTags();
  return div.childNodes[0].nodeValue;
}

// converts rgb() and #xxx to #xxxxxx format,  
// returns self (or first argument) if not convertable  
String.prototype.parseColor = function() {  
  color = "#";  
  if (this.slice(0, 4) == "rgb(") {  
    var cols = this.slice(4, this.length-1).split(',');  
    var i = 0; 
    do { 
      color += parseInt(cols[i]).toColorPart() 
    } while (++i < 3);  
  } else {  
    if (this.slice(0, 1) == '#') {  
      if (this.length == 4) {
        for(var i = 1; i < 4; i++) {
          color += (this.charAt(i)+this.charAt(i)).toLowerCase();
        }
      }
      if (this.length == 7) {
        color = this.toLowerCase();
      }
    }  
  }  
  return(color.length == 7 ? color : (arguments[0] || this));  
}

String.prototype.Trim = function() {
  return this.replace(/(^\s*)|(\s*$)/g, "");
}

String.prototype.LTrim = function() {
  return this.replace(/(^\s*)/g, "");
}

String.prototype.RTrim = function() {
  return this.replace(/(\s*$)/g, "");
}

String.prototype.Left = function(n){
  if (n <= 0) {
    return "";
  } else {
    if (n > this.length) {
      return this;
    } else {
      return this.substring(0, n);
    }
  }
}

String.prototype.Right = function(n){
  if (n <= 0) {
    return "";
  } else {
    var iLen = this.length;
    if (n > iLen) {
       return this;
    } else {
       return this.substring(iLen, iLen-n);
    }
  }
}

String.prototype.IsEmpty = function() {
  return (this.Trim() == '' || this.Trim() == null);
}

String.prototype.Contains = function(arr) {
  if (!arr) {
    arr = ["'",'"','\\'];
  }
  for (var i = 0; i < this.length; i++) {
    var c = this.charAt(i);
    for (var j = 0; j < arr.length; j++) {
      if (c == arr[j]) {
        return true;
      }
    }
  }
  return false;
}

String.prototype.In = function(arr) {
  for (var i = 0; i < arr.length; i++) {
    if (this.Trim() == arr[i])
      return true;
  }
  return false;
}

String.prototype.EndsWith = function(arr) {
  for (var i = 0; i < arr.length; i++) {
    if (this.indexOf(arr[i]) == this.length-arr[i].length) {
      return true;
    }
  }
  return false;
};

String.prototype.Escape = function(EscapeType) {
  switch (EscapeType) {
    case String.EscapeTypes.Database    : return this.replace(/[\']/g, "''");
    case String.EscapeTypes.Script      : return this.replace(/([\'\"])/g,"\\$1");
    case String.EscapeTypes.URI       : return encodeURI(this);
    case String.EscapeTypes.URIComponent  : return encodeURIComponent(this);
    case String.EscapeTypes.Rate        : return encodeURI(this).replace(/\&/g, "%26").replace(/\+/g, "%2B");
    default                 : return escape(this);
}
};
String.prototype.Unescape = function(EscapeType) {
  switch (EscapeType) {
    case String.EscapeTypes.Script :
      return this.replace(/\\\'/g,"'").replace(/\\\"/g,'"');
    case String.EscapeTypes.URI :
      return decodeURI(this);
    case String.EscapeTypes.URIComponent :
      return decodeURIComponent(this);
    default :
      return unescape(this);
  }
}

String.prototype.ParseCurrency = function() {
  return parseFloat(this.replace(/[\s\$,]/g,""));
}

String.prototype.Format = function(FormatType) {
  var s = this.Trim();
  switch (FormatType) {
    case String.FormatTypes.Date : {
      var d = new Date(this);
      if (!isNaN(d)) {
        if (this.search(/\d{3}/) == -1) {
          d.setYear(Math.floor((new Date()).getFullYear() / 100) * 100 + d.getFullYear() % 100);
        }
        s = d.GetHumanDateString();
      }
      break;
    }
    case String.FormatTypes.ShortDate : {
      var d = new Date(this);
      if (!isNaN(d)) {
        if (this.search(/\d{3}/) == -1) {
          d.setYear(Math.floor((new Date()).getFullYear() / 100) * 100 + d.getFullYear() % 100);
        }
        s = d.GetShortDateString();
      }
      break;
    }
    case String.FormatTypes.Time : {
      var t = new Date(this);
      if (!isNaN(t)) {
        s = t.GetHumanTimeString();
      }
      break;
    }
    case String.FormatTypes.PostalCode : {
      var temp = this.replace(/\D/g, "");
      if (temp.length == 5 || temp.length == 9) {
        if (temp.length == 5) s = temp;
        else s = temp.substring(0,5) + "-" + temp.substring(5,9);
      }
      break;
    }
    case String.FormatTypes.Phone : {
      var temp = this.replace(/\D/g, "");
      if (temp.length > 9 && temp.length < 26) {
        if (temp.length == 10) {
          s = "(" + temp.substring(0,3) + ") ";
          s += temp.substring(3,6) + "-" + temp.substring(6,10);
        }
      }
      break;
    }
    case String.FormatTypes.Currency : {
      if (s.Validate(FormatType)) {
        var numplaces = 2;
        var neg = false;
        var temp = this.ParseCurrency();
        if (temp < 0) {
          neg = true;
          temp = Math.abs(temp);
        }
        temp = Math.round(temp*Math.pow(10,numplaces))/Math.pow(10,numplaces);
        temp = String(temp);
        if (temp.indexOf('.') == -1) temp += '.00';
        temp = temp.split('.');
        if (temp[1].length < 2) temp[1] += '0';
        if (temp[0].length > 3) {
          var arr = [];
          for (var i=0;i<temp[0].length;i++) arr[arr.length] = temp[0].charAt(i);
          arr = arr.reverse();
          arr2 = [];
          for (var i=0;i<arr.length;i++) {
            arr2[arr2.length] = arr[i];
            if ((i+1)%3==0) arr2[arr2.length] = ',';
          }
          arr = arr2.reverse();
          temp[0] = '';
          if (arr[0] == ',') arr.shift();
          for (var i=0;i<arr.length;i++) temp[0] += arr[i];
        }
        s = ((neg?'-':'')) + '$' + temp.join('.');
      }
      break;
    }
    default : { break; }
  };
  return s;
};
String.prototype.Validate = function(FormatType) {
  switch (FormatType) {
    case String.FormatTypes.DateTime :
    case String.FormatTypes.Date :
    case String.FormatTypes.Time : {
      return !isNaN(new Date(this.Trim()));
    }
    case String.FormatTypes.Phone : {
      var temp = this.replace(/\D/g, "");
      return temp.length > 9 && temp.length < 26;
    }
    case String.FormatTypes.PostalCode : {
      var temp = this.replace(/\D/g, "");
      return temp.match(/^\d{5}$|^\d{9}$/) != null;
    }
    case String.FormatTypes.Email : {
      var temp = this.replace(/\s/g, "");
      return (temp.match(/^[\w\.\-]+\x40[\w\.\-]+\.\w{3}$/)) && temp.charAt(0) != "." && !(temp.match(/\.\./));
    }
    case String.FormatTypes.Currency : {
      var temp = this.replace(/\s/g, "");
      if (!temp.IsEmpty()) {
        if (temp.indexOf(',') > -1) b = temp.match(/\$?(\d{0,3}(,\d{3})*)(\.\d{0,4})?/) != null;
        return temp.match(/\$?\d*(\.\d{0,4})?/) != null;
      } else return false;
    }
    default : { break; }
  }
  return true;
};
if (isUndef(JSCL)) {
  var JSCL = {};
}

JSCL.namespace = function() {
  var a = arguments, o = null, i, j, d;
  var l = a.length;
  for (i = 0; i < l; i++) {
    d = a[i].split(".");
    o = window;
    for (j = 0; j < d.length; j++) {
      o[d[j]] = o[d[j]]||{};
      o = o[d[j]];
    }
  }
  return o;
};

JSCL.namespace("JSCL.Lang", "JSCL.System", "JSCL.Crypto", "JSCL.Database", "JSCL.Net", "JSCL.UI", "JSCL.Events", "JSCL.Engine", "JSCL.Application");
/**
 Creates a new class object which inherits from superClass.
 @param className="anonymous"  The name of the new class.
 If the created class is a public member of a module then
 the className is automatically set.
 @param superClass=Object        The class to inherit from (super class).
 @param classScope                  A function which is executed for class construction.
 As 1st parameter it will get the new class' protptype for
 overrideing or extending the super class. As 2nd parameter it will get
 the super class' wrapper for calling inherited methods.
 */
JSCL.Lang.Class = function(className, superClass, classScope) {
  if (arguments.length == 2) {
    classScope = superClass;
    if (typeof className != "string") {
      superClass = className;
      className = "anonymous";
    } else {
      superClass = Object;
    }
  } else if(arguments.length == 1) {
    classScope = className;
    superClass = Object;
    className = "anonymous";
  }

  //this is the constructor for the new objects created from the new class.
  //if and only if it is NOT used for prototyping/subclassing the init method of the newly created object will be called.
  var NewClass = function(calledBy) {
    if (calledBy !== JSCL.Lang.Class) {
      return this.init.apply(this, arguments);
    }
  }
  //This will create a new prototype object of the new class.
  NewClass.createPrototype = function() {
    return new NewClass(JSCL.Lang.Class);
  }
  //setting class properties for the new class.
  NewClass.superClass = superClass;
  NewClass.className = className;
  NewClass.toString = function() {
	  try {
		  return "[class %s]".format(NewClass.className);
	  } catch (ex) {
		  return "string.format not supported. " + NewClass.className
	  }
  };
  if (superClass.createPrototype != null) {//see if the super class can create prototypes. (creating an object without calling init())
    NewClass.prototype = superClass.createPrototype();
  } else { //just create an object of the super class
    NewClass.prototype = new superClass();
  }
  //reset the constructor for new objects to the actual constructor.
  NewClass.prototype.constructor = NewClass;

  if (superClass == Object) { //all other objects already have a nice toString method.
    NewClass.prototype.toString = function() {
    	try {
    		return "[object %s]".format(this.constructor.className);
    	} catch (ex) {
    		return "string.format not supported. " + this.constructor.className
    	}
    };
  }

  if (NewClass.prototype.init == null) {
    NewClass.prototype.init = function() {
    }
  }


  //create a supr  function to be used to call methods of the super class
  var supr = function(self) {
    //set up super class functionality  so a call to super(this) will return an object with all super class methods
    //the methods can be called like super(this).foo and the this object will be bound to that method
    var wrapper = {};
    var superProto = superClass.prototype;
    for(var n in superProto){
      if(typeof superProto[n] == "function"){
        wrapper[n] = function(){
          var f = arguments.callee;
          return superProto[f._name].apply(self, arguments);
        }
        wrapper[n]._name = n;
      }
    }
    return wrapper;
  }

  var join = function() {
    var i, s = arguments[0];
    for (i = 1; i < arguments.length; i++) {
      s += arguments[i].substr(0,1).toUpperCase()+arguments[i].substr(1)
    }
    return s;
  };

  //execute the scope of the class
  classScope(NewClass.prototype, supr);

  return NewClass;
}
JSCL.Lang.Class.toString = function() {
  return "[object JSCL.Lang.Class]";
}
JSCL.Lang.Class.createPrototype=function() {
  throw "Can't use JSCL.Lang.Class as a super class.";
}

JSCL.Lang.Exception =
  JSCL.Lang.Class("JSCL.Lang.Exception", Error,
                  function(publ) {
                    /**
                     Initializes a new Exception.
                     @param msg           The error message for the user.
                     */
                    publ.init = function(msg) {
                      this.name = this.constructor.className;
                      this.message = msg;
                    }

                    publ.toString=function(){
                      var s = this.name+"\n\n";
                      s += this.message;
                      return s;
                    }
                    ///The name of the Exception(className).
                    publ.name;
                    ///The error message.
                    publ.message;
                  }
                 )
  ;
;
JSCL.Lang.ArgumentException =
  JSCL.Lang.Class("JSCL.Lang.ArgumentException", JSCL.Lang.Exception,
                  function(publ, supr) {
                    /**
                     Initializes a new Exception.
                     @param msg           The error message for the user.
                     */
                    publ.init = function(msg){
                      supr(this).init("Üzenet: "+msg);
                    }
                  }
                 )
  ;
;
JSCL.Lang.XmlException =
  JSCL.Lang.Class("JSCL.Lang.XmlException", JSCL.Lang.Exception,
                  function(publ, supr) {
                    /**
                     Initializes a new Exception.
                     @param msg           The error message for the user.
                     */
                    publ.init = function(msg){
                      supr(this).init("Üzenet: "+msg);
                    }
                  }
                 )
  ;
;
JSCL.Events.EventArgs =
  JSCL.Lang.Class("JSCL.Events.EventArgs",
                  function(publ) {
                    publ.init = function(e, params) {
                      this.TimeStamp = new Date();
                      this.EventType = e.type;
                      this.event = e;
                      this.params = params;
                    };
                    publ.setParameters = function(params) {
                      this.params = params;
                    }
                    publ.TimeStamp = null;
                    publ.EventType = null;
                    publ.event = null;
                    publ.params = null;
                  }
                 );
JSCL.Events.EventHandler =
  JSCL.Lang.Class("JSCL.Events.EventHandler",
                  function(publ) {
                    publ.init = function(fn, ac) {
                       this.func = (fn) ? fn : null;
                       this.argClass = (ac) ? ac : JSCL.Events.EventArgs;
                    }
                    publ.func;
                    publ.argClass;
                    publ.GetHandler = function() {
                      return this.func;
                    } ;
                    publ.GetArgsClass = function() {
                      return this.argClass;
                    };
                    publ.RunOnce = false;
                  }
                 )
  ;
;
JSCL.Events.RevokeException =
  JSCL.Lang.Class("JSCL.Events.RevokeException", JSCL.Lang.Exception,
                  function(publ, supr) {
                    /**
                     Initializes a new Exception.
                     @param msg           The error message for the user.
                     */
                    publ.init = function(msg){
                      supr(this).init("Üzenet: "+msg);
                    }
                  }
                 )
  ;
;
JSCL.Events.AllowException =
  JSCL.Lang.Class("JSCL.Events.AllowException", JSCL.Lang.Exception,
                  function(publ, supr) {
                    /**
                     Initializes a new Exception.
                     @param msg           The error message for the user.
                     */
                    publ.init = function(msg){
                      supr(this).init("Üzenet: "+msg);
                    };
                  }
                 );
JSCL.Events.Listener = function() {
  var handlers = [];
  var me = this;
  var parameters = null;
  this.Invoke = function(e) {
    if (typeof(e) == "undefined") {
      var e = {
        type : "Unknown"
      };
    }
    var t = [];
    for (var i = 0; i < handlers.length; i++) {
      t.push(handlers[i]);
    }
    var retval = true;
    try {
      while (t.length > 0) {
        var h = t[t.length-1];
        (h.GetHandler())(this, new (h.GetArgsClass())(e, parameters)) ; // invoke the event handler
        if (h.RunOnce) {
          me.Remove(h);
        }
        t.pop();
      }
    } catch (ex) {
      if (Object.IsInstanceOf(ex, JSCL.Events.RevokeException)) {
        retval = false;
      } else {
        if (Object.IsInstanceOf(ex, JSCL.Events.AllowException)) {
          // Csak kiléptünk a ciklusból, igaz értékkel visszatérünk.
        } else {
          throw (ex);
        }
      }
    }
    return (retval);
  };
  this.Add = this.Invoke.Add = function(fn) {
    if (Object.IsInstanceOf(fn, Function)) {
      fn = new JSCL.Events.EventHandler(fn);
    }
    handlers.push(fn);
  };
  this.setParameters = this.Invoke.setParameters = function(pars) {
    parameters = pars;
  }
  this.Remove = this.Invoke.Remove = function(fn) {
    if (Object.IsSubTypeOf(fn, JSCL.Events.EventHandler)) {
      fn = fn.GetHandler();
    }
    var idx = -1;
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i].GetHandler() == fn) {
        idx = i;
        break;
      }
    }
    return handlers.splice(idx, 1);
  };
  this.Reset = this.Invoke.Reset = function() {
    handlers = [];
  }
  this.jsclName = this.Invoke.jsclName = "JSCL.Events.Listener";
}
/*
JSCL.Events.Listener =
  JSCL.Lang.Class("JSCL.Events.Listener",
                  function(publ) {
                    publ.init = function() {
                      this.handlers = [];
                    }
                    publ.handlers;
                    publ.Invoke = function(e) {
                      if (typeof(e) == "undefined") {
                        var e = {
                          type : "Unknown"
                        };
                      }
                      var t = [];
                      for (var i = 0; i < publ.handlers.length; i++) {
                        t.push(publ.handlers[i]);
                      }
                      while (t.length > 0) {
                        var h = t[t.length-1];
                        (h.GetHandler())(this, new (h.GetArgsClass())(e)) ; // invoke the event handler
                        if (h.RunOnce) {
                          this.Remove(h);
                        }
                        t.pop();
                      }
                    };
                    publ.Add = function(fn) {
                      if (fn.IsInstanceOf(Function)) {
                        fn = new JSCL.Events.EventHandler(fn);
                      }
                      publ.handlers.push(fn);
                    };
                    publ.Remove = function(fn) {
                      if (fn.IsSubTypeOf(JSCL.Events.EventHandler)) {
                        fn = fn.GetHandler();
                      }
                      var idx = -1 ;
                      for (var i = 0; i < publ.handlers.length; i++) {
                        if (publ.handlers[i].GetHandler() == fn) {
                          idx = i;
                          break;
                        }
                      }
                      return publ.handlers.splice(idx, 1);
                    };
                    publ.Reset = function() {
                      publ.handlers = [];
                    }
                  }
                 )
  ;
;
*/
var		param = new Array( "%yyyy", "%yy", "%gg", "%g", "%a", "%mm", "%m", "%emm", "%em", "%dd", "%d", "%ww", "%w", "%eww", "%ew", "%hh", "%h", "%ff", "%f", "%nn", "%n", "%ss", "%s", "%tt", "%ett" );
var		start = new Array( "1989/01/08", "1926/12/25", "1912/07/30", "1868/09/08" );
var		month_eng = new Array( "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" );
var		week_eng = new Array( "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" );
var		hh12 = new Array( "12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11" );
var		ampm_eng = new Array( "am", "pm" );

/************************************************/
/*      Conversion of a Date                    */
/************************************************/
function cnvDate(date, format) {
  var		dt;
  var		dy, dm, dd, dw;
  var		th, tm, ts;
  var		ampm;
  var		i, j, k;
  var		ret = "";

  dt = new Date(date);
  dy = dt.getYear();
  if (dy < 1900) {
    dy += 1900;
  }
  dm = dt.getMonth() + 1;
  dd = dt.getDate();
  dw = dt.getDay();
  th = dt.getHours();
  tm = dt.getMinutes();
  ts = dt.getSeconds();
  ampm = Math.floor(th / 12);

  i = 0;
  while( i < format.length )
  {
    for( j = 0; j < param.length; j ++ )
    {
      if( format.substr(i, param[j].length).toLowerCase() == param[j] )
      {
        break;
      }
    }
    if( j == param.length )
    {
      if( format.substr(i, 2) == "%%" )
      {
        ret += "%";
        i += 2;
      }
      else
      {
        if( format.charAt(i) != "%" )
        {
          ret += format.charAt(i);
        }
        i ++;
      }
      continue;
    }

    switch( j )
    {
      case 0 :		//	%yyyy	
        ret += ("0000".substr(0, 4 - (dy.toString()).length) + dy).toString();
        break;
      case 1 :		//	%yy		
        ret += ("00".substr(0, 2 - ((dy % 100).toString()).length) + (dy % 100)).toString();
        break;
      case 2 :		//	%gg		
        for( k = 0; k < start.length; k ++ )
        {
          if( dt >= new Date(start[k]) )
          {
            ret += gengo[k];
            break;
          }
        }
        break;
      case 3 :		//	%g		
        for( k = 0; k < start.length; k ++ )
        {
          if( dt >= new Date(start[k]) )
          {
            ret += gengo[k].substr(0, 1);
            break;
          }
        }
        break;
      case 4 :		//	%a		
        for( k = 0; k < start.length; k ++ )
        {
          if( dt >= new Date(start[k]) )
          {
            ret += (dy - ((Number(start[k].substr(0, 4)) - 1))).toString();
            break;
          }
        }
        if( k == start.length )
        {
          ret += dy.toString();
        }
        break;
      case 5 :		//	%mm		
        ret += ("00".substr(0, 2 - (dm.toString()).length) + dm).toString();
        break;
      case 6 :		//	%m		
        ret += dm.toString();
        break;
      case 7 :		//	%emm	
        if( format.substr(i, param[j].length) != param[j].toUpperCase() )
        {
          ret += month_eng[dm - 1];
        }
        else
        {
          ret += month_eng[dm - 1].toUpperCase();
        }
        break;
      case 8 :		//	%em		
        if( format.substr(i, param[j].length) != param[j].toUpperCase() )
        {
          ret += month_eng[dm - 1].substr(0, 3);
        }
        else
        {
          ret += month_eng[dm - 1].substr(0, 3).toUpperCase();
        }
        break;
      case 9 :		//	%dd		
        ret += ("00".substr(0, 2 - (dd.toString()).length) + dd).toString();
        break;
      case 10 :		//	%d		
        ret += dd.toString();
        break;
      case 11 :		//	%ww		
        break;
      case 12 :		//	%w		
        break;
      case 13 :		//	%eww	
        if( format.substr(i, param[j].length) != param[j].toUpperCase() )
        {
          ret += week_eng[dw];
        }
        else
        {
          ret += week_eng[dw].toUpperCase();
        }
        break;
      case 14 :		//	%ew		
        if( format.substr(i, param[j].length) != param[j].toUpperCase() )
        {
          ret += week_eng[dw].substr(0, 3);
        }
        else
        {
          ret += week_eng[dw].substr(0, 3).toUpperCase();
        }
        break;
      case 15 :		//	%hh		
        ret += ("00".substr(0, 2 - (th.toString()).length) + th).toString();
        break;
      case 16 :		//	%h		
        ret += th.toString();
        break;
      case 17 :		//	%ff		
        ret += ("00".substr(0, 2 - hh12[th % 12].length) + hh12[th % 12]).toString();
        break;
      case 18 :		//	%f		
        ret += hh12[th % 12];
        break;
      case 19 :		//	%nn		
        ret += ("00".substr(0, 2 - (tm.toString()).length) + tm).toString();
        break;
      case 20 :		//	%n		
        ret += tm.toString();
        break;
      case 21 :		//	%ss		
        ret += ("00".substr(0, 2 - (ts.toString()).length) + ts).toString();
        break;
      case 22 :		//	%s		
        ret += ts.toString();
        break;
      case 23 :		//	%tt		
        break;
      case 24 :		//	%ett	am/pm
        if( format.substr(i, param[j].length) != param[j].toUpperCase() )
        {
          ret += ampm_eng[ampm];
        }
        else
        {
          ret += ampm_eng[ampm].toUpperCase();
        }
        break;
    }
    i += param[j].length;
  }

  return( ret );
}

function getDaysInMonth(month, year)  {
  var days;
  if (month==1 || month==3 || month==5 || month==7 || month==8 || month==10 || month==12) {
    days=31;
  } else {
    if (month==4 || month==6 || month==9 || month==11) {
      days=30;
    } else {
      if (month==2)  {
        if (isLeapYear(year)) {
          days=29;
        } else {
          days=28;
        }
      }
    }
  }
  return (days);
}
function isLeapYear (Year) {
  if (((Year % 4)==0) && ((Year % 100)!=0) || ((Year % 400)==0)) {
    return (true);
  } else {
    return (false);
  }
}
var dtCh= ".";
var minYear=1800;
var maxYear=2200;

function isInteger(s) {
  var i;
  for (i = 0; i < s.length; i++){
    // Check that current character is number.
    var c = s.charAt(i);
    if (((c < "0") || (c > "9"))) {
      return false;
    }
  }
  // All characters are numbers.
  return true;
}

function stripCharsInBag(s, bag){
  var i;
  var returnString = "";
  // Search through string's characters one by one.
  // If character is not in bag, append to returnString.
  for (i = 0; i < s.length; i++){
    var c = s.charAt(i);
    if (bag.indexOf(c) == -1) {
      returnString += c;
    }
  }
  return returnString;
}


function daysInFebruary (year){
  // February has 29 days in any year evenly divisible by four,
  // EXCEPT for centurial years which are not also divisible by 400.
  return (((year % 4 == 0) && ( (!(year % 100 == 0)) || (year % 400 == 0))) ? 29 : 28 );
}

function DaysArray(n) {
  for (var i = 1; i <= n; i++) {
    this[i] = 31;
    if (i==4 || i==6 || i==9 || i==11) {
      this[i] = 30;
    }
    if (i==2) {
      this[i] = 29;
    }
  }
  return this;
}

function isDate(fld){
  var dtStr = fld.value;
  if (dtStr.length == 0) {
    return true;
  }
  var daysInMonth = DaysArray(12);
  var pos1=dtStr.indexOf(dtCh);
  var pos2=dtStr.indexOf(dtCh,pos1+1);
  var strYear=dtStr.substring(0,pos1);
  var strMonth=dtStr.substring(pos1+1,pos2);
  var strDay=dtStr.substring(pos2+1);
  strYr=strYear;
  if (strDay.charAt(0)=="0" && strDay.length>1) {
    strDay=strDay.substring(1);
  }
  if (strMonth.charAt(0)=="0" && strMonth.length>1) {
    strMonth=strMonth.substring(1);
  }
  for (var i = 1; i <= 3; i++) {
    if (strYr.charAt(0)=="0" && strYr.length>1) {
      strYr=strYr.substring(1);
    }
  }
  month=parseInt(strMonth);
  day=parseInt(strDay);
  year=parseInt(strYr);
  if (pos1 == -1 || pos2 == -1){
    return false;
  }
  if (strMonth.length < 1 || month < 1 || month > 12){
    return false;
  }
  if (strDay.length < 1 || day < 1 || day > 31 || (month == 2 && day > daysInFebruary(year)) || day > daysInMonth[month]) {
    return false;
  }
  if (strYear.length != 4 || year == 0 || year < minYear || year > maxYear){
    return false;
  }
  if (dtStr.indexOf(dtCh, pos2+1)!=-1 || isInteger(stripCharsInBag(dtStr, dtCh)) == false) {
    return false;
  }
  return true;
}

function InStr(c, separator, dot) {
  var j;
  var c2;
  if (isUndef(separator)) {
    separator = ' ';
  }
  if (isUndef(dot)) {
    dot = '.';
  }
  var str = "-1234567890"+separator+dot;
  for (j = 0; j < str.length; j++) {
    c2 = str.charAt(j);
    if (c == c2) {
      return (true);
    }
  }
  return (false);
}
function checkNumber(fld, separator, dot) {
  var b;
  var c;
  var c2;
  var n;
  var pontoksz = 0;
  var retval;
  if (isUndef(separator)) {
    separator = ' ';
  }
  if (isUndef(dot)) {
    dot = '.';
  }
  var l = fld.value.length;
  if (l != 0) {
    for (n = 0; n < l; n++) {
      c = fld.value.charAt(n);
      if (c==dot) pontoksz++;
      if (InStr(c, separator, dot) == false) {
        return (false);
      }
    }
  }
  if (pontoksz>1){
    return (false);
  }
  return (true);
}

function removeThousandSepar(fld, separ) {
  if (isUndef(separ)) {
    fld.value = fld.value.split(' ').join('');
  } else {
    fld.value = fld.value.split(separ).join('');
  }
  return (true);
}

function insertThousandSepar(fld, separator, dot) {
  var v = fld.value;
  if (isUndef(separator)) {
    separator = " ";
  }
  if (isUndef(dot)) {
    dot = ".";
  }
  var pos = v.indexOf(dot);
  if (pos >= 0) {
    egesz = v.substr(0, pos);
    tizedes = v.substr(pos, v.length);
  } else {
    egesz = v;
    tizedes = "";
  }
  // var intval = egesz.replace(new RegExp(separator, "g"), "");
  var intval = egesz.split(separator).join('');
  var regexp = new RegExp("\\B(\\d{3})("+separator+"|$)");
  do {
    intval = intval.replace(regexp, separator+"$1");
  } while(intval.search (regexp) >= 0);
  if (pos >= 0) {
    fld.value = intval+tizedes;
  } else {
    fld.value = intval;
  }
}

function checkBszla2(strSzla){
  if (strSzla.length == 0) {
    return true;
  }
  if (strSzla.length == 26) {
    var Tag1s = strSzla.substring(0, 7);
    var Tag2s = strSzla.substring(9, 16);
    var Tag3s = strSzla.substring(18, 25);
    if  (strSzla.charAt(8)!="-"){
      return false;
    }
    if  (strSzla.charAt(17)!="-"){
      return false;
    }
    if (Tag1s.charAt(0)<"0"||Tag1s.charAt(0)>"9"||Tag2s.charAt(0)<"0"|| Tag2s.charAt(0)>"9"||Tag3s.charAt(0)<"0"||Tag3s.charAt(0)>"9"){
      return false;
    }
    for (var i=1; i>=7; i++){
      if (Tag1s.charAt(i)<"0"||Tag1s.charAt(i)>"9"||Tag2s.charAt(i)<"0"||Tag2s.charAt(i)>"9"||Tag3s.charAt(i)<"0"||Tag3s.charAt(i)>"9"){
        return false;
      }
    }
  } else if (strSzla.length==17) {
    var Tag1s = strSzla.substring(0, 7);
    var Tag2s = strSzla.substring(9, 16);
    if  (strSzla.charAt(8)!="-"){
      return false;
    }
    if (Tag1s.charAt(0)<"0"||Tag1s.charAt(0)>"9"||Tag2s.charAt(0)<"0"||Tag2s.charAt(0)>"9"){
      return false;
    }
    for (var i=1; i>=7; i++){
      if (Tag1s.charAt(i)<"0"||Tag1s.charAt(i)>"9"||Tag2s.charAt(i)<"0"||Tag2s.charAt(i)>"9"){
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}


function checkBszlaOri(str){ // 2007.04.20 mentés
  var i;
  var elso8 = new Array();
  var masodik8 = new Array();
  var harmadik8 = new Array();
  var osszeg = 0;
  switch (str.length) {
    case 0 :
      return true;
      break;
    case 26 :
      if  (str.charAt(8) != '-'){
        return false;
      }
      if  (str.charAt(17) != '-'){
        return false;
      }
      for (i = 0; i < 8; i++) {
        var c = str.charAt(i);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        elso8[i+1] = n;
        var c = str.charAt(i+9);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        masodik8[i+1] = n;
        var c = str.charAt(i+18);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        harmadik8[i+1] = n;
      }
      if (elso8[1] < 1) {
        return (false);
      }
      osszeg = elso8[1]*9+elso8[2]*7+elso8[3]*3+elso8[4]+elso8[5]*9+elso8[6]*7+elso8[7]*3;
      if (((10-(osszeg % 10)) % 10) != elso8[8]) {
        return (false);
      }
      osszeg = masodik8[1]*9+masodik8[2]*7+masodik8[3]*3+masodik8[4]+masodik8[5]*9+masodik8[6]*7+masodik8[7]*3+masodik8[8]+harmadik8[1]*9+harmadik8[2]*7+harmadik8[3]*3+harmadik8[4]+harmadik8[5]*9+harmadik8[6]*7+harmadik8[7]*3;
      if (((10-(osszeg % 10)) % 10) != harmadik8[8]) {
        return (false);
      }
      break;
    case 17 :
      if  (str.charAt(8) != '-'){
        return false;
      }
      for (i = 0; i < 8; i++) {
        var c = str.charAt(i);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        elso8[i+1] = n;
        var c = str.charAt(i+9);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        masodik8[i+1] = n;
      }
      if (elso8[1] < 1) {
        return (false);
      }
      osszeg = elso8[1]*9+elso8[2]*7+elso8[3]*3+elso8[4]+elso8[5]*9+elso8[6]*7+elso8[7]*3;
      if (((10-(osszeg % 10)) % 10) != elso8[8]) {
        return (false);
      }
      osszeg = masodik8[1]*9+masodik8[2]*7+masodik8[3]*3+masodik8[4]+masodik8[5]*9+masodik8[6]*7+masodik8[7]*3;
      if (((10-(osszeg % 10)) % 10) != masodik8[8]) {
        return (false);
      }
      break;
    default:
      return false;
  }
  return true;
}

function checkBszla(str){ // 2007.04.20 Csak a 24 karakteres az elfogadható
  var i;
  var elso8 = new Array();
  var masodik8 = new Array();
  var harmadik8 = new Array();
  var osszeg = 0;
  switch (str.length) {
    case 0 :
      return true;
      break;
    case 26 :
      if  (str.charAt(8) != '-'){
        return false;
      }
      if  (str.charAt(17) != '-'){
        return false;
      }
      for (i = 0; i < 8; i++) {
        var c = str.charAt(i);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        elso8[i+1] = n;
        var c = str.charAt(i+9);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        masodik8[i+1] = n;
        var c = str.charAt(i+18);
        var n = parseInt(c);
        if (isNaN(n)) {
          return (false);
        }
        harmadik8[i+1] = n;
      }
      if (elso8[1] < 1) {
        return (false);
      }
      osszeg = elso8[1]*9+elso8[2]*7+elso8[3]*3+elso8[4]+elso8[5]*9+elso8[6]*7+elso8[7]*3;
      if (((10-(osszeg % 10)) % 10) != elso8[8]) {
        return (false);
      }
      osszeg = masodik8[1]*9+masodik8[2]*7+masodik8[3]*3+masodik8[4]+masodik8[5]*9+masodik8[6]*7+masodik8[7]*3+masodik8[8]+harmadik8[1]*9+harmadik8[2]*7+harmadik8[3]*3+harmadik8[4]+harmadik8[5]*9+harmadik8[6]*7+harmadik8[7]*3;
      if (((10-(osszeg % 10)) % 10) != harmadik8[8]) {
        return (false);
      }
      break;
    default:
      return false;
  }
  return true;
}

function checkBszlaElem(fld) {
  var strSzla = fld.value;
  return (checkBszla(strSzla));
}

function checkPersonNum(strPN){
  var i;
  var szj = new Array();
  var osszeg = 0;
  var oldType = true;
  if (strPN.length == 0) {
    return true;
  }
  if (strPN.length != 11) {
    return (false);
  }
  for (i = 0; i < 11; i++) {
    var c = strPN.charAt(i);
    var n = parseInt(c);
    if (isNaN(n)) {
      return (false);
    }
    szj[i+1] = n;
  }
  if (szj[1] == 3 || szj[1] == 4) {
    if (szj[2]*10+szj[3] < 70) {
      oldType = false;
    }
  }
  if (szj[1] == 1 || szj[1] == 2) {
    if (szj[2]*10+szj[3] > 96) {
      oldType = false;
    }
  }
  if (oldType) {
    for (i = 1; i < 11; i++) {
      osszeg += szj[i]*i;
    }
  } else {
    for (i = 1; i < 11; i++) {
      osszeg += szj[i]*(11-i);
    }
  }
  if (osszeg % 11 != szj[11]) {
    return (false);
  }
  return true;
}

function checkPersonNumElem(fld){
  var strPN = fld.value;
  return (checkPersonNum(strPN));
}

function checkTaxNum(strTN){
  var i;
  var osszeg = 0;
  if (strTN.length == 0) {
    return true;
  }
  if (strTN.length != 10) {
    return (false);
  }

  for (i = 0; i < 10; i++) {
    var c = strTN.charAt(i);
    var n = parseInt(c);
    if (isNaN(n)) {
      return (false);
    }
    switch (i) {
      case 0 :
        if (n != 8) {
          return (false);
        }
        osszeg += n*(i+1);
        break;
      case 9 :
        if (osszeg % 11 != n) {
          return (false);
        }
        break;
      default :
        osszeg += n*(i+1);
        break;
    }
  }
  return true;
}

function checkTaxNumElem(fld){
  var strTN = fld.value;
  return (checkTaxNum(strTN));
}

function checkPercent(fld) {
  var c;
  var retval;
  retval=checkNumber(fld);
  if (retval) {
    c=parseFloat(fld.value);
    if (c<0 || c>100) {
      return (false);
    }
  }
  return (retval);
}

function checkBusinessTaxNum(strBTN){
  var i;
  var osszeg = 0;
  var value = 0;

  if (strBTN.length == 0) {
    return true;
  }
  if (strBTN.length != 11) {
    return (false);
  }
  for (i = 0; i < 7; i++) {
    var c = strBTN.charAt(i);
    var n = parseInt(c);
    if (isNaN(n)) {
      return (false);
    }
    switch (i) {
    case 0 :
    case 4 :
      osszeg += n * 9;
      break;
    case 1 :
    case 5 :
      osszeg += n * 7;
      break;
    case 2 :
    case 6 :
      osszeg += n * 3;
      break;
    case 3 :
      osszeg += n;
      break;
      default :
        break;
    }
  }

  osszeg += '';
  var lastDigit =  parseInt(osszeg.charAt(osszeg.length-1));
  var checkDigit = parseInt(strBTN.charAt(7));
  if( checkDigit > 0 ){
    value = 10 - lastDigit;
  } else {
    value = lastDigit;
  }

  if(value === checkDigit){
    return true;
  }{
    return false;
  }
}

function checkBusinessTaxNumElem(fld){
  return (checkBusinessTaxNum(fld.value));
}
//*****************************************************************************
// Do not remove this notice.
//
// Copyright 2001 by Mike Hall.
// See http://www.brainjar.com for terms of use.
//*****************************************************************************

// Determine browser and version.

function Browser() {

  var ua, s, i;

  this.isIE    = false;
  this.isNS    = false;
  this.version = null;

  ua = navigator.userAgent;

  s = "MSIE";
  if ((i = ua.indexOf(s)) >= 0) {
    this.isIE = true;
    this.version = parseFloat(ua.substr(i + s.length));
    return;
  }

  s = "Netscape6/";
  if ((i = ua.indexOf(s)) >= 0) {
    this.isNS = true;
    this.version = parseFloat(ua.substr(i + s.length));
    return;
  }

  // Treat any other "Gecko" browser as NS 6.1.

  s = "Gecko";
  if ((i = ua.indexOf(s)) >= 0) {
    this.isNS = true;
    this.version = 6.1;
    return;
  }
}

var browser = new Browser();

// Global object to hold drag information.

var dragObj = new Object();
dragObj.zIndex = 0;

function dragStart(event, id) {

  var el;
  var x, y;

  // If an element id was given, find it. Otherwise use the element being
  // clicked on.

  if (id)
    //dragObj.elNode = document.getElementById(id);
    dragObj.elNode = id;// document.getElementById(id);
  else {
    if (browser.isIE)
      dragObj.elNode = window.event.srcElement;
    if (browser.isNS)
      dragObj.elNode = event.target;

    // If this is a text node, use its parent element.

    if (dragObj.elNode.nodeType == 3)
      dragObj.elNode = dragObj.elNode.parentNode;
  }

  // Get cursor position with respect to the page.

  if (browser.isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  if (browser.isNS) {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Save starting positions of cursor and element.

  dragObj.cursorStartX = x;
  dragObj.cursorStartY = y;
  dragObj.elStartLeft  = parseInt(dragObj.elNode.style.left, 10);
  dragObj.elStartTop   = parseInt(dragObj.elNode.style.top,  10);

  if (isNaN(dragObj.elStartLeft)) dragObj.elStartLeft = 0;
  if (isNaN(dragObj.elStartTop))  dragObj.elStartTop  = 0;

  // Update element's z-index.

  dragObj.elNode.style.zIndex = ++dragObj.zIndex;

  // Capture mousemove and mouseup events on the page.

  if (browser.isIE) {
    document.attachEvent("onmousemove", dragGo);
    document.attachEvent("onmouseup",   dragStop);
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  if (browser.isNS) {
    document.addEventListener("mousemove", dragGo,   true);
    document.addEventListener("mouseup",   dragStop, true);
    event.preventDefault();
  }
}

function dragGo(event) {

  var x, y;

  // Get cursor position with respect to the page.

  if (browser.isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  if (browser.isNS) {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Move drag element by the same amount the cursor has moved.

  dragObj.elNode.style.left = (dragObj.elStartLeft + x - dragObj.cursorStartX) + "px";
  dragObj.elNode.style.top  = (dragObj.elStartTop  + y - dragObj.cursorStartY) + "px";

  if (browser.isIE) {
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  if (browser.isNS)
    event.preventDefault();
}

function dragStop(event) {

  // Stop capturing mousemove and mouseup events.

  if (browser.isIE) {
    document.detachEvent("onmousemove", dragGo);
    document.detachEvent("onmouseup",   dragStop);
  }
  if (browser.isNS) {
    document.removeEventListener("mousemove", dragGo,   true);
    document.removeEventListener("mouseup",   dragStop, true);
  }
}
JSCL.System.Logger =
  JSCL.Lang.Class("JSCL.System.Logger",
                  function(publ) {
                    publ.init = function(name) {
                      this.name = name;
                      this.debugConsole = null;
                      this.level = 0;
                      this.focus = false;
                    }
                    publ.name;
                    publ.debugConsole;
                    publ.level;
                    publ.focus;
                    publ.LOGLEVEL = {
                      DEBUG : 300, INFO : 200, WARN : 100, OFF : 0
                    };

                    publ.safeWrite = function(s) {
                      return (s.replace(/\&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
                    }

                    publ.log = function(msg, warn){
	                      if (this.debugConsole == null || (this.debugConsole.closed)) {
	                        this.debugConsole = window.open("", this.name, "height=600,width=810,scrollbars=1,menubar=0,resizable=1,status=0,titlebar=0,toolbar=0");
	                        this.debugConsole.document.open("text/html");
	                        this.debugConsole.document.writeln("<html>");
	                        this.debugConsole.document.writeln(" <head>");
	                        this.debugConsole.document.writeln("  <style>");
	                        this.debugConsole.document.writeln("   pre {");
	                        this.debugConsole.document.writeln("    width:800px;");
	                        this.debugConsole.document.writeln("    word-wrap:break-word;");
	                        this.debugConsole.document.writeln("    font-family:monospace;");
	                        this.debugConsole.document.writeln("    font-size:10px;");
	                        this.debugConsole.document.writeln("    color:blue");
	                        this.debugConsole.document.writeln("   }");
	                        this.debugConsole.document.writeln("  </style>");
	                        this.debugConsole.document.writeln(" </head>");
	                        this.debugConsole.document.writeln(" <body>");
	                        this.debugConsole.document.writeln("  <div style='width:800px'>");
	                      }
	                      if (warn) {
	                        this.debugConsole.document.writeln("<pre style='color:red'>");
	                      } else {
	                        this.debugConsole.document.writeln("<pre>");
	                      }
	                      this.debugConsole.document.writeln(this.safeWrite(msg));
	                      this.debugConsole.document.writeln("</pre>");
	                      if (this.focus == true) {
	                        this.debugConsole.focus();
	                      }
                    }

                    publ.debug = function(msg) {
                      if (this.level >= this.LOGLEVEL.DEBUG) {
                        this.log("DEBG[" + cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss") +"]: " + msg);
                      }
                    }

                    publ.warn = function(msg) {
                      if (this.level >= this.LOGLEVEL.WARN) {
                        this.log("WARN[" + cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss") + "]: " + msg, true);
                      }
                    }

                    publ.error = function(msg) {
                      if (this.level >= this.LOGLEVEL.WARN) {
                        this.log("ERRR[" + cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss") + "]: " + msg, true);
                      }
                    }

                    publ.info = function(msg) {
                      if (this.level >= this.LOGLEVEL.INFO) {
                        this.log("INFO[" + cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss") + "]: " + msg);
                      }
                    }

                    publ.debugMode =  function() {
                      this.level = this.LOGLEVEL.DEBUG;
                    }


                    publ.warnMode = function() {
                      this.level = this.LOGLEVEL.WARN;
                    }

                    publ.infoMode = function() {
                      this.level = this.LOGLEVEL.INFO;
                    }

                    publ.off = function() {
                      this.level = this.LOGLEVEL.OFF;
                    }

                    publ.makeFocus = function() {
                      this.focus = true;
                    }

                    publ.loseFocus = function() {
                      this.focus = false;
                    }
                  }
                 )
  ;
;
var logger = new JSCL.System.Logger("Common");
if (developByFigaro) {
  /*logger.debugMode();*/
  logger.off();
} else {
  logger.off();
}


JSCL.Crypto.Base =
  JSCL.Lang.Class("JSCL.Crypto.Base",
                  function(publ) {
                    publ.init = function() {
                    }
                    publ.cipherModes = { 
                    	ECB:0, 
                    	CBC:1, 
                    	PCBC:2, 
                    	CFB:3, 
                    	OFB:4, 
                    	CTR:5 
                    };
                    publ.outputTypes = { 
                    	Base64:0,
                    	Hex:1,
                    	String:2,
                    	Raw:3 
                    };
                  }
                 )
  ;
;
JSCL.Crypto.Blowfish =
  JSCL.Lang.Class("JSCL.Crypto.Blowfish", JSCL.Crypto.Base,
                  function(publ, supr) {
                    publ.init = function(key) {
                      supr(this).init();
                      this.key = key;
                      this.setIV("0000000000000000", this.outputTypes.Hex);
                    }
                    publ.key = null;
                    var POW2=Math.pow(2,2);
                    var POW3=Math.pow(2,3);
                    var POW4=Math.pow(2,4);
                    var POW8=Math.pow(2,8);
                    var POW16=Math.pow(2,16);
                    var POW24=Math.pow(2,24);
                    var iv=null;	//	CBC mode initialization vector
                    var boxes={
                    p:[
                       0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
                       0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
                       0x9216d5d9, 0x8979fb1b
                      ],
                      s0:[
                          0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7, 0xb8e1afed, 0x6a267e96, 0xba7c9045, 0xf12c7f99,
                          0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16, 0x636920d8, 0x71574e69, 0xa458fea3, 0xf4933d7e,
                          0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee, 0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013,
                          0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef, 0x8e79dcb0, 0x603a180e, 0x6c9e0e8b, 0xb01e8a3e,
                          0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60, 0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440,
                          0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce, 0xa15486af, 0x7c72e993, 0xb3ee1411, 0x636fbc2a,
                          0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e, 0xafd6ba33, 0x6c24cf5c, 0x7a325381, 0x28958677,
                          0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193, 0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032,
                          0xef845d5d, 0xe98575b1, 0xdc262302, 0xeb651b88, 0x23893e81, 0xd396acc5, 0x0f6d6ff3, 0x83f44239,
                          0x2e0b4482, 0xa4842004, 0x69c8f04a, 0x9e1f9b5e, 0x21c66842, 0xf6e96c9a, 0x670c9c61, 0xabd388f0,
                          0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3, 0x6eef0b6c, 0x137a3be4, 0xba3bf050, 0x7efb2a98,
                          0xa1f1651d, 0x39af0176, 0x66ca593e, 0x82430e88, 0x8cee8619, 0x456f9fb4, 0x7d84a5c3, 0x3b8b5ebe,
                          0xe06f75d8, 0x85c12073, 0x401a449f, 0x56c16aa6, 0x4ed3aa62, 0x363f7706, 0x1bfedf72, 0x429b023d,
                          0x37d0d724, 0xd00a1248, 0xdb0fead3, 0x49f1c09b, 0x075372c9, 0x80991b7b, 0x25d479d8, 0xf6e8def7,
                          0xe3fe501a, 0xb6794c3b, 0x976ce0bd, 0x04c006ba, 0xc1a94fb6, 0x409f60c4, 0x5e5c9ec2, 0x196a2463,
                          0x68fb6faf, 0x3e6c53b5, 0x1339b2eb, 0x3b52ec6f, 0x6dfc511f, 0x9b30952c, 0xcc814544, 0xaf5ebd09,
                          0xbee3d004, 0xde334afd, 0x660f2807, 0x192e4bb3, 0xc0cba857, 0x45c8740f, 0xd20b5f39, 0xb9d3fbdb,
                          0x5579c0bd, 0x1a60320a, 0xd6a100c6, 0x402c7279, 0x679f25fe, 0xfb1fa3cc, 0x8ea5e9f8, 0xdb3222f8,
                          0x3c7516df, 0xfd616b15, 0x2f501ec8, 0xad0552ab, 0x323db5fa, 0xfd238760, 0x53317b48, 0x3e00df82,
                          0x9e5c57bb, 0xca6f8ca0, 0x1a87562e, 0xdf1769db, 0xd542a8f6, 0x287effc3, 0xac6732c6, 0x8c4f5573,
                          0x695b27b0, 0xbbca58c8, 0xe1ffa35d, 0xb8f011a0, 0x10fa3d98, 0xfd2183b8, 0x4afcb56c, 0x2dd1d35b,
                          0x9a53e479, 0xb6f84565, 0xd28e49bc, 0x4bfb9790, 0xe1ddf2da, 0xa4cb7e33, 0x62fb1341, 0xcee4c6e8,
                          0xef20cada, 0x36774c01, 0xd07e9efe, 0x2bf11fb4, 0x95dbda4d, 0xae909198, 0xeaad8e71, 0x6b93d5a0,
                          0xd08ed1d0, 0xafc725e0, 0x8e3c5b2f, 0x8e7594b7, 0x8ff6e2fb, 0xf2122b64, 0x8888b812, 0x900df01c,
                          0x4fad5ea0, 0x688fc31c, 0xd1cff191, 0xb3a8c1ad, 0x2f2f2218, 0xbe0e1777, 0xea752dfe, 0x8b021fa1,
                          0xe5a0cc0f, 0xb56f74e8, 0x18acf3d6, 0xce89e299, 0xb4a84fe0, 0xfd13e0b7, 0x7cc43b81, 0xd2ada8d9,
                          0x165fa266, 0x80957705, 0x93cc7314, 0x211a1477, 0xe6ad2065, 0x77b5fa86, 0xc75442f5, 0xfb9d35cf,
                          0xebcdaf0c, 0x7b3e89a0, 0xd6411bd3, 0xae1e7e49, 0x00250e2d, 0x2071b35e, 0x226800bb, 0x57b8e0af,
                          0x2464369b, 0xf009b91e, 0x5563911d, 0x59dfa6aa, 0x78c14389, 0xd95a537f, 0x207d5ba2, 0x02e5b9c5,
                          0x83260376, 0x6295cfa9, 0x11c81968, 0x4e734a41, 0xb3472dca, 0x7b14a94a, 0x1b510052, 0x9a532915,
                          0xd60f573f, 0xbc9bc6e4, 0x2b60a476, 0x81e67400, 0x08ba6fb5, 0x571be91f, 0xf296ec6b, 0x2a0dd915,
                          0xb6636521, 0xe7b9f9b6, 0xff34052e, 0xc5855664, 0x53b02d5d, 0xa99f8fa1, 0x08ba4799, 0x6e85076a
                         ],
                      s1:[
                          0x4b7a70e9, 0xb5b32944, 0xdb75092e, 0xc4192623, 0xad6ea6b0, 0x49a7df7d, 0x9cee60b8, 0x8fedb266,
                          0xecaa8c71, 0x699a17ff, 0x5664526c, 0xc2b19ee1, 0x193602a5, 0x75094c29, 0xa0591340, 0xe4183a3e,
                          0x3f54989a, 0x5b429d65, 0x6b8fe4d6, 0x99f73fd6, 0xa1d29c07, 0xefe830f5, 0x4d2d38e6, 0xf0255dc1,
                          0x4cdd2086, 0x8470eb26, 0x6382e9c6, 0x021ecc5e, 0x09686b3f, 0x3ebaefc9, 0x3c971814, 0x6b6a70a1,
                          0x687f3584, 0x52a0e286, 0xb79c5305, 0xaa500737, 0x3e07841c, 0x7fdeae5c, 0x8e7d44ec, 0x5716f2b8,
                          0xb03ada37, 0xf0500c0d, 0xf01c1f04, 0x0200b3ff, 0xae0cf51a, 0x3cb574b2, 0x25837a58, 0xdc0921bd,
                          0xd19113f9, 0x7ca92ff6, 0x94324773, 0x22f54701, 0x3ae5e581, 0x37c2dadc, 0xc8b57634, 0x9af3dda7,
                          0xa9446146, 0x0fd0030e, 0xecc8c73e, 0xa4751e41, 0xe238cd99, 0x3bea0e2f, 0x3280bba1, 0x183eb331,
                          0x4e548b38, 0x4f6db908, 0x6f420d03, 0xf60a04bf, 0x2cb81290, 0x24977c79, 0x5679b072, 0xbcaf89af,
                          0xde9a771f, 0xd9930810, 0xb38bae12, 0xdccf3f2e, 0x5512721f, 0x2e6b7124, 0x501adde6, 0x9f84cd87,
                          0x7a584718, 0x7408da17, 0xbc9f9abc, 0xe94b7d8c, 0xec7aec3a, 0xdb851dfa, 0x63094366, 0xc464c3d2,
                          0xef1c1847, 0x3215d908, 0xdd433b37, 0x24c2ba16, 0x12a14d43, 0x2a65c451, 0x50940002, 0x133ae4dd,
                          0x71dff89e, 0x10314e55, 0x81ac77d6, 0x5f11199b, 0x043556f1, 0xd7a3c76b, 0x3c11183b, 0x5924a509,
                          0xf28fe6ed, 0x97f1fbfa, 0x9ebabf2c, 0x1e153c6e, 0x86e34570, 0xeae96fb1, 0x860e5e0a, 0x5a3e2ab3,
                          0x771fe71c, 0x4e3d06fa, 0x2965dcb9, 0x99e71d0f, 0x803e89d6, 0x5266c825, 0x2e4cc978, 0x9c10b36a,
                          0xc6150eba, 0x94e2ea78, 0xa5fc3c53, 0x1e0a2df4, 0xf2f74ea7, 0x361d2b3d, 0x1939260f, 0x19c27960,
                          0x5223a708, 0xf71312b6, 0xebadfe6e, 0xeac31f66, 0xe3bc4595, 0xa67bc883, 0xb17f37d1, 0x018cff28,
                          0xc332ddef, 0xbe6c5aa5, 0x65582185, 0x68ab9802, 0xeecea50f, 0xdb2f953b, 0x2aef7dad, 0x5b6e2f84,
                          0x1521b628, 0x29076170, 0xecdd4775, 0x619f1510, 0x13cca830, 0xeb61bd96, 0x0334fe1e, 0xaa0363cf,
                          0xb5735c90, 0x4c70a239, 0xd59e9e0b, 0xcbaade14, 0xeecc86bc, 0x60622ca7, 0x9cab5cab, 0xb2f3846e,
                          0x648b1eaf, 0x19bdf0ca, 0xa02369b9, 0x655abb50, 0x40685a32, 0x3c2ab4b3, 0x319ee9d5, 0xc021b8f7,
                          0x9b540b19, 0x875fa099, 0x95f7997e, 0x623d7da8, 0xf837889a, 0x97e32d77, 0x11ed935f, 0x16681281,
                          0x0e358829, 0xc7e61fd6, 0x96dedfa1, 0x7858ba99, 0x57f584a5, 0x1b227263, 0x9b83c3ff, 0x1ac24696,
                          0xcdb30aeb, 0x532e3054, 0x8fd948e4, 0x6dbc3128, 0x58ebf2ef, 0x34c6ffea, 0xfe28ed61, 0xee7c3c73,
                          0x5d4a14d9, 0xe864b7e3, 0x42105d14, 0x203e13e0, 0x45eee2b6, 0xa3aaabea, 0xdb6c4f15, 0xfacb4fd0,
                          0xc742f442, 0xef6abbb5, 0x654f3b1d, 0x41cd2105, 0xd81e799e, 0x86854dc7, 0xe44b476a, 0x3d816250,
                          0xcf62a1f2, 0x5b8d2646, 0xfc8883a0, 0xc1c7b6a3, 0x7f1524c3, 0x69cb7492, 0x47848a0b, 0x5692b285,
                          0x095bbf00, 0xad19489d, 0x1462b174, 0x23820e00, 0x58428d2a, 0x0c55f5ea, 0x1dadf43e, 0x233f7061,
                          0x3372f092, 0x8d937e41, 0xd65fecf1, 0x6c223bdb, 0x7cde3759, 0xcbee7460, 0x4085f2a7, 0xce77326e,
                          0xa6078084, 0x19f8509e, 0xe8efd855, 0x61d99735, 0xa969a7aa, 0xc50c06c2, 0x5a04abfc, 0x800bcadc,
                          0x9e447a2e, 0xc3453484, 0xfdd56705, 0x0e1e9ec9, 0xdb73dbd3, 0x105588cd, 0x675fda79, 0xe3674340,
                          0xc5c43465, 0x713e38d8, 0x3d28f89e, 0xf16dff20, 0x153e21e7, 0x8fb03d4a, 0xe6e39f2b, 0xdb83adf7
                         ],
                      s2:[
                          0xe93d5a68, 0x948140f7, 0xf64c261c, 0x94692934, 0x411520f7, 0x7602d4f7, 0xbcf46b2e, 0xd4a20068,
                          0xd4082471, 0x3320f46a, 0x43b7d4b7, 0x500061af, 0x1e39f62e, 0x97244546, 0x14214f74, 0xbf8b8840,
                          0x4d95fc1d, 0x96b591af, 0x70f4ddd3, 0x66a02f45, 0xbfbc09ec, 0x03bd9785, 0x7fac6dd0, 0x31cb8504,
                          0x96eb27b3, 0x55fd3941, 0xda2547e6, 0xabca0a9a, 0x28507825, 0x530429f4, 0x0a2c86da, 0xe9b66dfb,
                          0x68dc1462, 0xd7486900, 0x680ec0a4, 0x27a18dee, 0x4f3ffea2, 0xe887ad8c, 0xb58ce006, 0x7af4d6b6,
                          0xaace1e7c, 0xd3375fec, 0xce78a399, 0x406b2a42, 0x20fe9e35, 0xd9f385b9, 0xee39d7ab, 0x3b124e8b,
                          0x1dc9faf7, 0x4b6d1856, 0x26a36631, 0xeae397b2, 0x3a6efa74, 0xdd5b4332, 0x6841e7f7, 0xca7820fb,
                          0xfb0af54e, 0xd8feb397, 0x454056ac, 0xba489527, 0x55533a3a, 0x20838d87, 0xfe6ba9b7, 0xd096954b,
                          0x55a867bc, 0xa1159a58, 0xcca92963, 0x99e1db33, 0xa62a4a56, 0x3f3125f9, 0x5ef47e1c, 0x9029317c,
                          0xfdf8e802, 0x04272f70, 0x80bb155c, 0x05282ce3, 0x95c11548, 0xe4c66d22, 0x48c1133f, 0xc70f86dc,
                          0x07f9c9ee, 0x41041f0f, 0x404779a4, 0x5d886e17, 0x325f51eb, 0xd59bc0d1, 0xf2bcc18f, 0x41113564,
                          0x257b7834, 0x602a9c60, 0xdff8e8a3, 0x1f636c1b, 0x0e12b4c2, 0x02e1329e, 0xaf664fd1, 0xcad18115,
                          0x6b2395e0, 0x333e92e1, 0x3b240b62, 0xeebeb922, 0x85b2a20e, 0xe6ba0d99, 0xde720c8c, 0x2da2f728,
                          0xd0127845, 0x95b794fd, 0x647d0862, 0xe7ccf5f0, 0x5449a36f, 0x877d48fa, 0xc39dfd27, 0xf33e8d1e,
                          0x0a476341, 0x992eff74, 0x3a6f6eab, 0xf4f8fd37, 0xa812dc60, 0xa1ebddf8, 0x991be14c, 0xdb6e6b0d,
                          0xc67b5510, 0x6d672c37, 0x2765d43b, 0xdcd0e804, 0xf1290dc7, 0xcc00ffa3, 0xb5390f92, 0x690fed0b,
                          0x667b9ffb, 0xcedb7d9c, 0xa091cf0b, 0xd9155ea3, 0xbb132f88, 0x515bad24, 0x7b9479bf, 0x763bd6eb,
                          0x37392eb3, 0xcc115979, 0x8026e297, 0xf42e312d, 0x6842ada7, 0xc66a2b3b, 0x12754ccc, 0x782ef11c,
                          0x6a124237, 0xb79251e7, 0x06a1bbe6, 0x4bfb6350, 0x1a6b1018, 0x11caedfa, 0x3d25bdd8, 0xe2e1c3c9,
                          0x44421659, 0x0a121386, 0xd90cec6e, 0xd5abea2a, 0x64af674e, 0xda86a85f, 0xbebfe988, 0x64e4c3fe,
                          0x9dbc8057, 0xf0f7c086, 0x60787bf8, 0x6003604d, 0xd1fd8346, 0xf6381fb0, 0x7745ae04, 0xd736fccc,
                          0x83426b33, 0xf01eab71, 0xb0804187, 0x3c005e5f, 0x77a057be, 0xbde8ae24, 0x55464299, 0xbf582e61,
                          0x4e58f48f, 0xf2ddfda2, 0xf474ef38, 0x8789bdc2, 0x5366f9c3, 0xc8b38e74, 0xb475f255, 0x46fcd9b9,
                          0x7aeb2661, 0x8b1ddf84, 0x846a0e79, 0x915f95e2, 0x466e598e, 0x20b45770, 0x8cd55591, 0xc902de4c,
                          0xb90bace1, 0xbb8205d0, 0x11a86248, 0x7574a99e, 0xb77f19b6, 0xe0a9dc09, 0x662d09a1, 0xc4324633,
                          0xe85a1f02, 0x09f0be8c, 0x4a99a025, 0x1d6efe10, 0x1ab93d1d, 0x0ba5a4df, 0xa186f20f, 0x2868f169,
                          0xdcb7da83, 0x573906fe, 0xa1e2ce9b, 0x4fcd7f52, 0x50115e01, 0xa70683fa, 0xa002b5c4, 0x0de6d027,
                          0x9af88c27, 0x773f8641, 0xc3604c06, 0x61a806b5, 0xf0177a28, 0xc0f586e0, 0x006058aa, 0x30dc7d62,
                          0x11e69ed7, 0x2338ea63, 0x53c2dd94, 0xc2c21634, 0xbbcbee56, 0x90bcb6de, 0xebfc7da1, 0xce591d76,
                          0x6f05e409, 0x4b7c0188, 0x39720a3d, 0x7c927c24, 0x86e3725f, 0x724d9db9, 0x1ac15bb4, 0xd39eb8fc,
                          0xed545578, 0x08fca5b5, 0xd83d7cd3, 0x4dad0fc4, 0x1e50ef5e, 0xb161e6f8, 0xa28514d9, 0x6c51133c,
                          0x6fd5c7e7, 0x56e14ec4, 0x362abfce, 0xddc6c837, 0xd79a3234, 0x92638212, 0x670efa8e, 0x406000e0
                         ],
                      s3:[
                          0x3a39ce37, 0xd3faf5cf, 0xabc27737, 0x5ac52d1b, 0x5cb0679e, 0x4fa33742, 0xd3822740, 0x99bc9bbe,
                          0xd5118e9d, 0xbf0f7315, 0xd62d1c7e, 0xc700c47b, 0xb78c1b6b, 0x21a19045, 0xb26eb1be, 0x6a366eb4,
                          0x5748ab2f, 0xbc946e79, 0xc6a376d2, 0x6549c2c8, 0x530ff8ee, 0x468dde7d, 0xd5730a1d, 0x4cd04dc6,
                          0x2939bbdb, 0xa9ba4650, 0xac9526e8, 0xbe5ee304, 0xa1fad5f0, 0x6a2d519a, 0x63ef8ce2, 0x9a86ee22,
                          0xc089c2b8, 0x43242ef6, 0xa51e03aa, 0x9cf2d0a4, 0x83c061ba, 0x9be96a4d, 0x8fe51550, 0xba645bd6,
                          0x2826a2f9, 0xa73a3ae1, 0x4ba99586, 0xef5562e9, 0xc72fefd3, 0xf752f7da, 0x3f046f69, 0x77fa0a59,
                          0x80e4a915, 0x87b08601, 0x9b09e6ad, 0x3b3ee593, 0xe990fd5a, 0x9e34d797, 0x2cf0b7d9, 0x022b8b51,
                          0x96d5ac3a, 0x017da67d, 0xd1cf3ed6, 0x7c7d2d28, 0x1f9f25cf, 0xadf2b89b, 0x5ad6b472, 0x5a88f54c,
                          0xe029ac71, 0xe019a5e6, 0x47b0acfd, 0xed93fa9b, 0xe8d3c48d, 0x283b57cc, 0xf8d56629, 0x79132e28,
                          0x785f0191, 0xed756055, 0xf7960e44, 0xe3d35e8c, 0x15056dd4, 0x88f46dba, 0x03a16125, 0x0564f0bd,
                          0xc3eb9e15, 0x3c9057a2, 0x97271aec, 0xa93a072a, 0x1b3f6d9b, 0x1e6321f5, 0xf59c66fb, 0x26dcf319,
                          0x7533d928, 0xb155fdf5, 0x03563482, 0x8aba3cbb, 0x28517711, 0xc20ad9f8, 0xabcc5167, 0xccad925f,
                          0x4de81751, 0x3830dc8e, 0x379d5862, 0x9320f991, 0xea7a90c2, 0xfb3e7bce, 0x5121ce64, 0x774fbe32,
                          0xa8b6e37e, 0xc3293d46, 0x48de5369, 0x6413e680, 0xa2ae0810, 0xdd6db224, 0x69852dfd, 0x09072166,
                          0xb39a460a, 0x6445c0dd, 0x586cdecf, 0x1c20c8ae, 0x5bbef7dd, 0x1b588d40, 0xccd2017f, 0x6bb4e3bb,
                          0xdda26a7e, 0x3a59ff45, 0x3e350a44, 0xbcb4cdd5, 0x72eacea8, 0xfa6484bb, 0x8d6612ae, 0xbf3c6f47,
                          0xd29be463, 0x542f5d9e, 0xaec2771b, 0xf64e6370, 0x740e0d8d, 0xe75b1357, 0xf8721671, 0xaf537d5d,
                          0x4040cb08, 0x4eb4e2cc, 0x34d2466a, 0x0115af84, 0xe1b00428, 0x95983a1d, 0x06b89fb4, 0xce6ea048,
                          0x6f3f3b82, 0x3520ab82, 0x011a1d4b, 0x277227f8, 0x611560b1, 0xe7933fdc, 0xbb3a792b, 0x344525bd,
                          0xa08839e1, 0x51ce794b, 0x2f32c9b7, 0xa01fbac9, 0xe01cc87e, 0xbcc7d1f6, 0xcf0111c3, 0xa1e8aac7,
                          0x1a908749, 0xd44fbd9a, 0xd0dadecb, 0xd50ada38, 0x0339c32a, 0xc6913667, 0x8df9317c, 0xe0b12b4f,
                          0xf79e59b7, 0x43f5bb3a, 0xf2d519ff, 0x27d9459c, 0xbf97222c, 0x15e6fc2a, 0x0f91fc71, 0x9b941525,
                          0xfae59361, 0xceb69ceb, 0xc2a86459, 0x12baa8d1, 0xb6c1075e, 0xe3056a0c, 0x10d25065, 0xcb03a442,
                          0xe0ec6e0e, 0x1698db3b, 0x4c98a0be, 0x3278e964, 0x9f1f9532, 0xe0d392df, 0xd3a0342b, 0x8971f21e,
                          0x1b0a7441, 0x4ba3348c, 0xc5be7120, 0xc37632d8, 0xdf359f8d, 0x9b992f2e, 0xe60b6f47, 0x0fe3f11d,
                          0xe54cda54, 0x1edad891, 0xce6279cf, 0xcd3e7e6f, 0x1618b166, 0xfd2c1d05, 0x848fd2c5, 0xf6fb2299,
                          0xf523f357, 0xa6327623, 0x93a83531, 0x56cccd02, 0xacf08162, 0x5a75ebb5, 0x6e163697, 0x88d273cc,
                          0xde966292, 0x81b949d0, 0x4c50901b, 0x71c65614, 0xe6c6c7bd, 0x327a140a, 0x45e1d006, 0xc3f27b9a,
                          0xc9aa53fd, 0x62a80f00, 0xbb25bfe2, 0x35bdd2f6, 0x71126905, 0xb2040222, 0xb6cbcf7c, 0xcd769c2b,
                          0x53113ec0, 0x1640e3d3, 0x38abbd60, 0x2547adf0, 0xba38209c, 0xf746ce76, 0x77afa1c5, 0x20756060,
                          0x85cbfe4e, 0x8ae88dd8, 0x7aaaf9b0, 0x4cf9aa7e, 0x1948c25c, 0x02fb8a8c, 0x01c36ae4, 0xd6ebe1f9,
                          0x90d4f869, 0xa65cdea0, 0x3f09252d, 0xc208e69f, 0xb74e6132, 0xce77e25b, 0x578fdfe3, 0x3ac372e6
                         ]
                    }
                    ////////////////////////////////////////////////////////////////////////////
                    function add(x,y){
                      var sum=(x+y)&0xffffffff;
                      if (sum<0){
                        sum=-sum;
                        return (0x10000*((sum>>16)^0xffff))+(((sum&0xffff)^0xffff)+1);
                      }
                      return sum;
                    }
                    function split(x){
                      var r=x&0xffffffff;
                      if(r<0) {
                        r=-r;
                        return [((r&0xffff)^0xffff)+1,(r>>16)^0xffff];
                      }
                      return [r&0xffff,(r>>16)];
                    }
                    function xor(x,y){
                      var xs=split(x);
                      var ys=split(y);
                      return (0x10000*(xs[1]^ys[1]))+(xs[0]^ys[0]);
                    }
                    function $(v, box){
                      var d=v&0xff; v>>=8;
                      var c=v&0xff; v>>=8;
                      var b=v&0xff; v>>=8;
                      var a=v&0xff;
                      var r=add(box.s0[a],box.s1[b]);
                      r=xor(r,box.s2[c]);
                      return add(r,box.s3[d]);
                    }
                    ////////////////////////////////////////////////////////////////////////////
                    function eb(o, box){
                      var l=o.left;
                      var r=o.right;
                      l=xor(l,box.p[0]);
                      r=xor(r,xor($(l,box),box.p[1]));
                      l=xor(l,xor($(r,box),box.p[2]));
                      r=xor(r,xor($(l,box),box.p[3]));
                      l=xor(l,xor($(r,box),box.p[4]));
                      r=xor(r,xor($(l,box),box.p[5]));
                      l=xor(l,xor($(r,box),box.p[6]));
                      r=xor(r,xor($(l,box),box.p[7]));
                      l=xor(l,xor($(r,box),box.p[8]));
                      r=xor(r,xor($(l,box),box.p[9]));
                      l=xor(l,xor($(r,box),box.p[10]));
                      r=xor(r,xor($(l,box),box.p[11]));
                      l=xor(l,xor($(r,box),box.p[12]));
                      r=xor(r,xor($(l,box),box.p[13]));
                      l=xor(l,xor($(r,box),box.p[14]));
                      r=xor(r,xor($(l,box),box.p[15]));
                      l=xor(l,xor($(r,box),box.p[16]));
                      o.right=l;
                      o.left=xor(r,box.p[17]);
                    }

                    function db(o, box){
                      var l=o.left;
                      var r=o.right;
                      l=xor(l,box.p[17]);
                      r=xor(r,xor($(l,box),box.p[16]));
                      l=xor(l,xor($(r,box),box.p[15]));
                      r=xor(r,xor($(l,box),box.p[14]));
                      l=xor(l,xor($(r,box),box.p[13]));
                      r=xor(r,xor($(l,box),box.p[12]));
                      l=xor(l,xor($(r,box),box.p[11]));
                      r=xor(r,xor($(l,box),box.p[10]));
                      l=xor(l,xor($(r,box),box.p[9]));
                      r=xor(r,xor($(l,box),box.p[8]));
                      l=xor(l,xor($(r,box),box.p[7]));
                      r=xor(r,xor($(l,box),box.p[6]));
                      l=xor(l,xor($(r,box),box.p[5]));
                      r=xor(r,xor($(l,box),box.p[4]));
                      l=xor(l,xor($(r,box),box.p[3]));
                      r=xor(r,xor($(l,box),box.p[2]));
                      l=xor(l,xor($(r,box),box.p[1]));
                      o.right=l;
                      o.left=xor(r,box.p[0]);
                    }

                    //	Note that we aren't caching contexts here; it might take a little longer
                    //	but we should be more secure this way.
                    function init(key){
                      var k=key;
                      if (typeof(k)=="string"){
                        var a=[];
                        for(var i=0; i<k.length; i++)
                          a.push(k.charCodeAt(i)&0xff);
                        k=a;
                      }
                      //	init the boxes
                      var box = { p:[], s0:[], s1:[], s2:[], s3:[] };
                      for(var i=0; i<boxes.p.length; i++) box.p.push(boxes.p[i]);
                      for(var i=0; i<boxes.s0.length; i++) box.s0.push(boxes.s0[i]);
                      for(var i=0; i<boxes.s1.length; i++) box.s1.push(boxes.s1[i]);
                      for(var i=0; i<boxes.s2.length; i++) box.s2.push(boxes.s2[i]);
                      for(var i=0; i<boxes.s3.length; i++) box.s3.push(boxes.s3[i]);

                      //	init p with the key
                      var pos=0;
                      var data=0;
                      for(var i=0; i < box.p.length; i++){
                        for (var j=0; j<4; j++){
                          data = (data*POW8) | k[pos];
                          if(++pos==k.length) pos=0;
                        }
                        box.p[i] = xor(box.p[i], data);
                      }

                      //	encrypt p and the s boxes
                      var res={ left:0, right:0 };
                      for(var i=0; i<box.p.length;){
                        eb(res, box);
                        box.p[i++]=res.left;
                        box.p[i++]=res.right;
                      }
                      for (var i=0; i<4; i++){
                        for(var j=0; j<box["s"+i].length;){
                          eb(res, box);
                          box["s"+i][j++]=res.left;
                          box["s"+i][j++]=res.right;
                        }
                      }
                      return box;
                    }

                    ////////////////////////////////////////////////////////////////////////////
                    //	CONVERSION FUNCTIONS
                    ////////////////////////////////////////////////////////////////////////////
                    //	these operate on byte arrays, NOT word arrays.
                    function toBase64(ba){
                      var p="=";
                      var tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                      var s=[];
                      var count=0;
                      for (var i =0; i<ba.length;){
                        var t=ba[i++]<<16|ba[i++]<<8|ba[i++];
                        s.push(tab.charAt((t>>>18)&0x3f));
                        s.push(tab.charAt((t>>>12)&0x3f));
                        s.push(tab.charAt((t>>>6)&0x3f));
                        s.push(tab.charAt(t&0x3f));
                        count+=4;
                      }
                      var pa=i-ba.length;
                      while((pa--)>0)	s.push(p);
                      return s.join("");
                    }
                    function fromBase64(str){
                      var s=str.split("");
                      var p="=";
                      var tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                      var out=[];
                      var l=s.length;
                      while(s[--l]==p){ }
                      for (var i=0; i<l;){
                        var t=tab.indexOf(s[i++])<<18|tab.indexOf(s[i++])<<12|tab.indexOf(s[i++])<<6|tab.indexOf(s[i++]);
                        out.push((t>>>16)&0xff);
                        out.push((t>>>8)&0xff);
                        out.push(t&0xff);
                      }
                      return out;
                    }
                    ////////////////////////////////////////////////////////////////////////////
                    //	PUBLIC FUNCTIONS
                    //	0.2: Only supporting ECB mode for now.
                    ////////////////////////////////////////////////////////////////////////////
                    publ.getIV=function(outputType){
                      var out=outputType||this.outputTypes.Base64;
                      switch(out){
                        case this.outputTypes.Hex:{
                          var s=[];
                          for(var i=0; i<iv.length; i++)
                            s.push((iv[i]).toString(16));
                          return s.join("");
                        }
                        case this.outputTypes.String:{
                          return iv.join("");
                        }
                        case this.outputTypes.Raw:{
                          return iv;
                        }
                        default:{
                          return toBase64(iv);
                        }
                      }
                    };
                    publ.setIV=function(data, inputType){
                      var ip=inputType||this.outputTypes.Base64;
                      var ba=null;
                      switch(ip){
                        case this.outputTypes.String:{
                          ba=[];
                          for (var i=0; i<data.length; i++){
                            ba.push(data.charCodeAt(i));
                          }
                          break;
                        }
                        case this.outputTypes.Hex:{
                          ba=[];
                          var i=0;
                          while (i+1<data.length){
                            ba.push(parseInt(data.substr(i,2),16));
                            i+=2;
                          }
                          break;
                        }
                        case this.outputTypes.Raw:{
                          ba=data;
                          break;
                        }
                        default:{
                          ba=fromBase64(data);
                          break;
                        }
                      }
                      //	make it a pair of words now
                      iv={};
                      iv.left=ba[0]*POW24|ba[1]*POW16|ba[2]*POW8|ba[3];
                      iv.right=ba[4]*POW24|ba[5]*POW16|ba[6]*POW8|ba[7];
                    }
                    publ.encrypt = function(plaintext, ao){
                      var out=this.outputTypes.Base64;
                      var mode=this.cipherModes.EBC;
                      if (ao){
                        if (ao.outputType) out=ao.outputType;
                        if (ao.cipherMode) mode=ao.cipherMode;
                      }

                      var bx = init(this.key);
                      var padding = 8-(plaintext.length&7);
                      for (var i=0; i<padding; i++) plaintext+=String.fromCharCode(padding);
                      var cipher=[];
                      var count=plaintext.length >> 3;
                      var pos=0;
                      var o={};
                      var isCBC=(mode==this.cipherModes.CBC);
                      var vector={left:iv.left||null, right:iv.right||null};
                      for(var i=0; i<count; i++){
                        o.left=plaintext.charCodeAt(pos)*POW24
                          |plaintext.charCodeAt(pos+1)*POW16
                          |plaintext.charCodeAt(pos+2)*POW8
                          |plaintext.charCodeAt(pos+3);
                        o.right=plaintext.charCodeAt(pos+4)*POW24
                          |plaintext.charCodeAt(pos+5)*POW16
                          |plaintext.charCodeAt(pos+6)*POW8
                          |plaintext.charCodeAt(pos+7);

                        if(isCBC){
                          o.left=xor(o.left, vector.left);
                          o.right=xor(o.right, vector.right);
                        }

                        eb(o, bx);	//	encrypt the block

                        if(isCBC){
                          vector.left=o.left;
                          vector.right=o.right;this.outputTypes.Hex
                        }

                        cipher.push((o.left>>24)&0xff);
                        cipher.push((o.left>>16)&0xff);
                        cipher.push((o.left>>8)&0xff);
                        cipher.push(o.left&0xff);
                        cipher.push((o.right>>24)&0xff);
                        cipher.push((o.right>>16)&0xff);
                        cipher.push((o.right>>8)&0xff);
                        cipher.push(o.right&0xff);
                        pos+=8;
                      }
                      switch(out){
                        case this.outputTypes.Hex:{
                          var s=[];
                          for(var i=0; i<cipher.length; i++)
                            s.push((cipher[i]).toString(16));
                          return s.join("");
                        }
                        case this.outputTypes.String:{
                          return cipher.join("");
                        }
                        case this.outputTypes.Raw:{
                          return cipher;
                        }
                        default:{
                          return toBase64(cipher);
                        }
                      }
                    };

                    publ.decrypt = function(ciphertext, ao){
                      var ip=this.outputTypes.Base64;
                      var mode=this.cipherModes.EBC;
                      if (ao){
                        if (ao.outputType) ip=ao.outputType;
                        if (ao.cipherMode) mode=ao.cipherMode;
                      }
                      var bx = init(this.key);
                      var pt=[];

                      var c=null;
                      switch(ip){
                        case this.outputTypes.Hex:{
                          c=[];
                          var i=0;
                          while (i+1<ciphertext.length){
                            c.push(parseInt(ciphertext.substr(i,2),16));
                            i+=2;
                          }
                          break;
                        }
                        case this.outputTypes.String:{
                          c=[];
                          for (var i=0; i<ciphertext.length; i++){
                            c.push(ciphertext.charCodeAt(i));
                          }
                          break;
                        }
                        case this.outputTypes.Raw:{
                          c=ciphertext;	//	should be a byte array
                          break;
                        }
                        default:{
                          c=fromBase64(ciphertext);
                          break;
                        }
                      }

                      var count=c.length >> 3;
                      var pos=0;
                      var o={};
                      var isCBC=(mode==this.cipherModes.CBC);
                      var vector={left:iv.left||null, right:iv.right||null};
                      for(var i=0; i<count; i++){
                        o.left=c[pos]*POW24|c[pos+1]*POW16|c[pos+2]*POW8|c[pos+3];
                        o.right=c[pos+4]*POW24|c[pos+5]*POW16|c[pos+6]*POW8|c[pos+7];

                        if(isCBC){
                          var left=o.left;
                          var right=o.right;
                        }

                        db(o, bx);	//	decrypt the block

                        if(isCBC){
                          o.left=xor(o.left, vector.left);
                          o.right=xor(o.right, vector.right);
                          vector.left=left;
                          vector.right=right;
                        }

                        pt.push((o.left>>24)&0xff);
                        pt.push((o.left>>16)&0xff);
                        pt.push((o.left>>8)&0xff);
                        pt.push(o.left&0xff);
                        pt.push((o.right>>24)&0xff);
                        pt.push((o.right>>16)&0xff);
                        pt.push((o.right>>8)&0xff);
                        pt.push(o.right&0xff);
                        pos+=8;
                      }

                      //	check for padding, and remove.
                      if(pt[pt.length-1]==pt[pt.length-2]||pt[pt.length-1]==0x01){
                        var n=pt[pt.length-1];
                        pt.splice(pt.length-n, n);
                      }

                      //	convert to string
                      for(var i=0; i<pt.length; i++)
                        pt[i]=String.fromCharCode(pt[i]);
                      return pt.join("");
                    };
                  }
                 )
  ;
;
JSCL.Net.XmlCache =
  JSCL.Lang.Class("JSCL.Net.XmlCache",
                  function(publ) {
                    publ.init = function(){
                      this._cache = [];
                    }
                    publ._chache;
                    publ.makeKey = function(url, data) {
                      // var key = encode64(url+data);
                      var key = url+data;
                      // logger.debug("kulcs:"+key);
                      return (key);
                    }
                    publ.put = function(url, data, xmlObj) {
                      this._cache[this.makeKey(url, data)] = xmlObj;                      
                    }
                    publ.get = function(url, data) {
                      return (this._cache[this.makeKey(url, data)]);
                    }
                    publ.remove = function(url, data) {
                      put(url, data, null);
                    }                   
                  }
                 )
  ;
;
JSCL.Net.XmlCacheObject = new JSCL.Net.XmlCache();
JSCL.Net.HTTP =
  JSCL.Lang.Class("JSCL.Net.HTTP",
                  function(publ) {
                    publ.init = function(){
                    };
                    publ.URL = null;
                    publ.popUp = null;
                    publ.waitPopupOnOff = true;
                    publ.async = true;
                    publ.requestMethod = "POST";
                    publ.requestData = "";
                    publ.responseText = function() {
                      return this._http ? this._http.responseText : "";
                    };
                    publ.responseXML = function() {
                      if (this._http) {
                        if (isUndef(this._http.responseXML)) {
                          alert(this._http.responseText);
                          return("");
                        } else {
                          return (this._http.responseXML);
                        }
                      } else {
                        return ("");
                      }
                    };
                    publ.onStart = function() {
                      if (this.waitPopupOnOff) {
                        try {
                          if (progressDialog) {
                            this.showed = true;
                            StartWorking();
                          } else {
                            this.popUp = window.open('', 'WorkInProgress', 'height=100, width=100, menubar=0, resizable=0, scrollbars=0, status=0,titlebar=0,toolbar=0');
                            this.popUp.document.open("text/html");
                            this.popUp.document.writeln("<html><body>");
                            this.popUp.document.writeln("Letöltés folyamatban...");
                            this.popUp.document.writeln("</body></html>");
                            this.popUp.document.close();
                          }
                        } catch (exc) {
                          // alert(exc.message);
                        }
                      }
                    };
                    publ.onStop = function() {
                      if (this.waitPopupOnOff) {
                        try {
                          if (progressDialog) {
                            this.showed = false;
                            StopWorking();
                          } else {
                            this.popUp.close();
                          }
                        } catch (exc) {
                        }
                      }
                    };
                    publ.username = null;
                    publ.password = null;
                    publ.CACHETYPE = {
                      NONE : 0, URL : 1, WINDOWID : 2
                    };
                    publ.dataToCache = null;
                    publ.urlToCache = null;
                    publ.cacheType = publ.CACHETYPE.NONE;
                    publ.setNamespace = function(name, value) {
                      this._namespaces += " xmlns:"+name+"=\""+value+"\"";
                    };
                    publ._namespaces = "";
                    publ.clearParameters = function() {
                      this._parameters = "";
                    };
                    publ.setParameter = function(name, value) {
                      this["_"+name+"Parameter"] = value;
                      var keres = "\\|"+name+"\\|";
                      if (!this._parameters.match(keres)) {
                        this._parameters += " |"+name+"|";
                      }
                    };
                    publ._parameters = "";
                    publ.setParameters = function(aParameters) {
                      for (var a in aParameters) {
                        if (a.Right(15) == "FigaroParameter") {
                          this.setParameter(a.Left(a.length-15), aParameters[a]);
                        }
                      }
                    };
                    publ.setMapParameters = function(aParameters) {
                      for (var a in aParameters) {
                        this.setParameter(a, aParameters[a]);
                      }
                    };
                    publ.setFormParameters = function(oForm, validate, ignorenec) {
                      if(isUndef(ignorenec)) {
                    	  ignorenec = false;
                      }
                      var fields = oForm.getFields();
                      var len = fields.length;
                      for (var j = 0; j < len; j++) {
                        var field = fields[j];
                        if (validate) {
                          field.onValidate();
                        }
                        if(!ignorenec) {
                          field.onNecessity();
                        }
                        this.setParameter(field.getId(), field.getValue());
                      }
                    };
                    publ.setRequestHeader = function(name, value) {
                      this["_"+name+"Header"] = value;
                      if (!this._headers.match(name)) {
                        this._headers += " "+name;
                      }
                    };
                    publ._headers = "";
                    publ.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    publ.setRequestHeader('Accept-Encoding', 'gzip');
                    publ.setRequestHeader('connection', 'Close');
                    publ.getResponseHeader = function(name) {
                      return this._http ? this._http.getResponseHeader(name) : "";
                    };
                    publ.request = function() {
                      var self = this;
                      this._ready = false;
                      var i, name, value, data = "", params = this._parameters.replace(/\|/g, "").split(" ");
                      var l = params.length;
                      for (i = 1; i < l; i++) {
                        name = params[i];
                        value = this["_"+name+"Parameter"];
                        if (typeof value == "function") {
                          value = value();
                        }
                        //
                        if (this.requestMethod == 'POST') {
                          if (typeof value == "string") {
                            data += name+"="+value.Escape(String.EscapeTypes.Rate)+"&";
                          } else {
                            data += name+"="+encodeURI(value)+"&";
                          }
                        } else {
                          if (typeof value == "string") {
                            data += name+"="+value.Escape(String.EscapeTypes.Rate)+"&";
                          } else {
                            data += name+"="+encodeURI(value)+"&";
                          }
                        }
                      }
                      var _URL = this.URL;
                      if ((this.requestMethod != "POST") && data) {
                        _URL += "?"+data;
                        data = null;
                      }
                      var cachedXml = null;
                      switch (this.cacheType) {
                        case this.CACHETYPE.NONE :
                          this.urlToCache = _URL;
                          this.dataToCache = data;
                          break;
                        case this.CACHETYPE.URL :
                          cachedXml = JSCL.Net.XmlCacheObject.get(_URL, data);
                          cachedXml = isUndef(cachedXml) ? null : cachedXml;
                          this.urlToCache = _URL;
                          this.dataToCache = data;
                          break;
                        case this.CACHETYPE.WINDOWID :
                          cachedXml = JSCL.Net.XmlCacheObject.get(_URL, this["_windowIdParameter"]);
                          cachedXml = isUndef(cachedXml) ? null : cachedXml;
                          this.urlToCache = _URL;
                          this.dataToCache = this["_windowIdParameter"];
                          break;
                        default :
                          this.urlToCache = _URL;
                          this.dataToCache = data;
                          break;
                      }
                      if (cachedXml !== null) {
                        self._http = {};
                        self._http.responseXML = cachedXml;
                        self._http.responseText = getXmlAsString(cachedXml);
                        if (developByFigaro) {
                          kiment(cachedXml);
                        }
                      } else {
                        this.onStart();
                        function wait() {
                          if (self._http.readyState == 4) {
                            self._ready = true;
                            returnResult();
                          } else {
                            setTimeout(wait, 200);
                          }
                        }

                        function returnResult() {
                          self.onStop();
                          if (self._http.responseXML && self._http.responseXML.hasChildNodes()) {
                            self.response(self._http.responseXML);
                          } else {
                            self.response(self._http.responseText);
                          }
                          if (developByFigaro) {
                            logger.debug(self._http.responseText);
                          }
                        }
                        var ciklusSzamlalo;
                        if (developByFigaro) {
                          logger.debug(this.requestMethod+' : '+data);
                        }
                        for (ciklusSzamlalo = 0; ciklusSzamlalo < 20; ciklusSzamlalo++) {
                          this._http = getTransport();
                          if (!this._http) {
                            alert("Kommunikációs hiba: Az MSXML nincs engedélyezve!")
                            throw (new JSCL.Lang.Exception("Transport-layer not found."));
                          }
                          this._http.open(this.requestMethod, _URL, this.async, this.username, this.password);
                          var headers = this._headers.split(" ");
                          for (i = 1; i < headers.length; i++) {
                            name = headers[i];
                            value = this["_"+name+"Header"];
                            if (typeof value == "function") {
                              value = value();
                            }
                            this._http.setRequestHeader(name, value);
                          }
                          var jsclTimestamp = new Date();
                          this._http.send(data+"proba="+ciklusSzamlalo+"&jscltimestamp="+jsclTimestamp+"&");
                          if (this._http.status == 200) {
                            if (this._http.responseText != "Copyright: 2005 - Figaro/Rate Software") {
                              break;
                            }
                          } else {
                            alert("Kommunikációs hiba: "+this._http.status+' - '+this._http.statusText);
                            break;
                          }
                        }
                        if(this._http.responseText == "Copyright: 2005 - Figaro/Rate Software") {
                          alert("Kommunikációs hiba: "+this._http.status+' - '+this._http.statusText);
                        } else {
                          if (this.async) {
                            setTimeout(wait, 200);
                          } else {
                            returnResult();
                          }
                        }
                      }
                    };

                    publ.response = function(result) {
                      if (this.$owner) {
                        this.$owner.refresh()
                      }
                    };

                    publ.isReady = function() {
                      return this._ready;
                    };
                  }
                 )
  ;
;
JSCL.Net.Ajax =
  JSCL.Lang.Class("JSCL.Net.Ajax",
                  function(publ) {
                    publ.init = function(){
                      this._listeners = [];
                    }
                    publ.SOURCETYPE = {
                      URL : 0, TEXT : 1, NODE : 2, EMBEDDED : 3
                    };
                    // publ.SOURCETYPE_URL = 0;
                    // publ.SOURCETYPE_TEXT = 1;
                    // publ.SOURCETYPE_XML = 2;
                    publ._sourceType = publ.SOURCETYPE.URL;                    
                    publ._src = null;
                    publ._listeners = null;
                    publ.URL;
                    publ.requestMethod = "POST";
                    publ.requestData = "";
                    publ.response = null;
                    publ.popUp = null;
                    publ.waitPopupOnOff = true;
                    publ.onStart = function() {
                      if (this.waitPopupOnOff) {
                        try {
                          if (msie && progressDialog) {
                            this.showed = true;
                            window.showModelessDialog('/MMMMMM/Wait.html', this, 'dialogHeight:200px;dialogWidth:150px;status:0');
                          } else {
                            this.popUp = window.open('', 'WorkInProgress', 'height=100, width=100, menubar=0, resizable=0, scrollbars=0, status=0,titlebar=0,toolbar=0');
                            this.popUp.document.open("text/html");
                            this.popUp.document.writeln("<html><body>");
                            this.popUp.document.writeln("Letöltés folyamatban...");
                            this.popUp.document.writeln("</body></html>");
                            this.popUp.document.close();
                          }
                        } catch (exc) {
                        }
                      }
                    }
                    publ.onStop = function() {
                      if (this.waitPopupOnOff) {
                        try {
                          if (msie && progressDialog) {
                            this.showed = false;
                          } else {
                            this.popUp.close();
                          }
                        } catch (exc) {
                        }
                      }
                    }
                    publ.addListener = function(listener) {
                      this._listeners.push(listener);                     
                    }
                    publ.setData = function(sourceType, src) {
                      this._sourceType = sourceType;
                      switch (sourceType) {
                        case this.SOURCETYPE.URL :
                          this.URL = src;
                          break;
                        case this.SOURCETYPE.TEXT :
                          this._src = src;
                          break;
                        case this.SOURCETYPE.NODE :
                          this._src = src;
                          break;
                        case this.SOURCETYPE.EMBEDDED :
                          this._src = document.getElementById(src).innerHTML.replace(/\<\!\-\-/, "").replace(/\-\-\>/, "");
                          break;
                        default :
                          throw new JSCL.Lang.ArgumentException("Invalid sourcetype.");
                      }
                    }
                    publ.retrieveData = function() {
                      this.request();
                    }                    
                    publ.responseText = function() {
                      return this._http ? this._http.responseText : ""
                    }
                    publ.responseXML = function() {                    
                      if (this._http) {
                        if (isUndef(this._http.responseXML)) {
                          alert(this._http.responseText);
                          return("");
                        } else {
                          return (this._http.responseXML);
                        }
                      } else {
                        return ("");
                      }
                    }
                    publ.username = null;
                    publ.password = null;
                    publ.dataToCache = null;
                    publ.urlToCache = null;
                    publ.useCache = false;
                    publ.setNamespace = function(name, value) {
                      this._namespaces += " xmlns:"+name+"=\""+value+"\"";
                    };
                    publ._namespaces = "";
                    publ.clearParameters = function() {
                      this._parameters = "";
                    }
                    publ.setParameter = function(name, value) {
                      this["_"+name+"Parameter"] = value;
                      var keres = "\\|"+name+"\\|";
                      if (!this._parameters.match(keres)) {
                        this._parameters += " |"+name+"|"
                      }
                    };
                    publ._parameters = "";
                    publ.setFormParameters = function(oForm, validate, ignorenec) {
                      if(isUndef(ignorenec)) {
                    	  ignorenec = false;
                      }
                      var fields = oForm.getFields();
                      var len = fields.length;
                      for (var j = 0; j < len; j++) {
                        var field = fields[j];
                        if (validate) {
                          field.onValidate();
                        }
                        if(!ignorenec) {
                          field.onNecessity();
                        }
                        this.setParameter(field.getId(), field.getValue());
                      }
                    }
                    publ.setRequestHeader = function(name, value) {
                      this["_"+name+"Header"] = value;
                      if (!this._headers.match(name)) {
                        this._headers += " "+name
                      }
                    };
                    publ._headers = "";                    
                    publ.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    publ.getResponseHeader = function(name) {
                      return this._http ? this._http.getResponseHeader(name) : "";
                    };
                    publ.request = function() {
                      var self = this;
                      this._ready = false;
                      var i, name, value, data = "", params = this._parameters.replace(/\|/g, "").split(" ");
                      var l = params.length;
                      for (i = 1; i < l; i++) {
                        name = params[i];
                        value = this["_"+name+"Parameter"];
                        if (typeof value == "function") {
                          value = value();
                        }
                        // 
                        if (this.requestMethod == 'POST') {
                          data += name+"="+encodeURI(value)+"&";
                        } else {
                          data += name+"="+encodeURI(value)+"&";
                        }
                      }
                      var _URL = this.URL;
                      if ((this.requestMethod != "POST") && data) {
                        _URL += "?"+data;
                        data = null;
                      }
                      if (this.useCache) {
                        var cachedXml = JSCL.Net.XmlCacheObject.get(_URL, data);
                        cachedXml = isUndef(cachedXml) ? null : cachedXml;
                      } else {
                        cachedXml = null;
                      }
                      function returnResult() {
                        if (self._http.responseXML && self._http.responseXML.hasChildNodes()) {
                          self.response = self._http.responseXML;
                        } else {
                          self.response = self._http.responseText;
                        }
                        if (developByFigaro) {                      
                          logger.debug(self._http.responseText);
                        }
                        var l = self._listeners.length;
                        for (var i = 0; i < l; i++) {
                          self._listeners[i].onRetrieveData(self.response);
                        }
                      }                      
                      if (cachedXml != null) {
                        self._http = {};
                        self._http.responseXML = cachedXml;
                        self._http.responseText = getXmlAsString(cachedXml);
                        self._ready = true;
                        if (developByFigaro) {                      
                          kiment(cachedXml);
                        }
                        returnResult();
                      } else {
                        this.onStart();
                        function wait() {
                          if (self._http.readyState == 4) {
                            self.onStop();
                            self._ready = true;
                            returnResult();
                          } else {
                            setTimeout(wait, 50);
                          }
                        }
                        this.urlToCache = _URL;
                        this.dataToCache = data;
                        this._http = getTransport();
                        if (!this._http) {
                          alert("Kommunikációs hiba: Az MSXML nincs engedélyezve!")
                          throw (new JSCL.Lang.Exception("Transport-layer not found."));
                        }
                        this._http.open(this.requestMethod, _URL, true, this.username, this.password);
                        var headers = this._headers.split(" ");
                        for (i = 1; i < headers.length; i++) {
                          name = headers[i];
                          value = this["_"+name+"Header"];
                          if (typeof value == "function") {
                            value = value();
                          }
                          this._http.setRequestHeader(name, value);
                        }
                        if (developByFigaro) {                      
                          logger.debug(this.requestMethod+' : '+data);
                        }
                        this._http.send(data);
                        setTimeout(wait, 50);
                      }
                    };

                    publ.isReady = function() {
                      return this._ready;
                    };
                  }
                 )
  ;
;
JSCL.Net.Xml =
  JSCL.Lang.Class("JSCL.Net.Xml", JSCL.Net.HTTP,
                  function(publ, supr) {
                    publ.init = function(){
                      supr(this).init();
                      this.xml = null;
                      this.neededRoot = null;
                    }
                    publ.SOURCETYPE = {
                      URL : 0, TEXT : 1, NODE : 2, EMBEDDED : 3
                    };
                    // publ.SOURCETYPE_URL = 0;
                    // publ.SOURCETYPE_TEXT = 1;
                    // publ.SOURCETYPE_XML = 2;
                    publ._sourceType = publ.SOURCETYPE.URL;
                    publ.xml;
                    publ.neededRoot;

                    publ.setData = function(sourceType, src) {
                      this._sourceType = sourceType;
                      switch (sourceType) {
                        case this.SOURCETYPE.URL :
                          this.URL = src;
                          break;
                        case this.SOURCETYPE.TEXT :
                          if (msie) {
                            this.xml = createIEDocument();
                            this.xml.async = "false";
                            this.xml.loadXML(src);
                          } else {
                            this.xml = (new DOMParser()).parseFromString(src, 'text/xml');
                          }
                          break;
                        case this.SOURCETYPE.NODE :
                          this.xml = src;
                          break;
                        case this.SOURCETYPE.EMBEDDED :
                          var xmlDoc = document.getElementById(src).innerHTML.replace(/\<\!\-\-/, "").replace(/\-\-\>/, "");
                          if (msie) {
                            this.xml = createIEDocument();
                            this.xml.async = "false";
                            this.xml.loadXML(xmlDoc);
                          } else {
                            this.xml = (new DOMParser()).parseFromString(xmlDoc, 'text/xml');
                          }
                          xmlDoc = null;
                          break;
                        default :
                          throw new JSCL.Lang.ArgumentException("Invalid sourcetype.");
                      }
                    }
                    publ.openErrorWindow = function(txt) {
                      try {
	                      var popUp = window.open('', 'Error', 'height=400, width=800, menubar=0, resizable=1, scrollbars=1, status=0,titlebar=0,toolbar=0');
  	                    popUp.document.open("text/html");
    	                  popUp.document.writeln(txt);
    	                  popUp.document.close();
    	                } catch (exc) {
    	                  alert(txt);
    	                }
                    }
                    publ.retrieveData = function() {
                      switch (this._sourceType) {
                        case this.SOURCETYPE.URL :
                          this.async = false;
                          this.request();
                          this.xml = this.responseXML();
                          delete this._http;
                          this._http = null;
                          if (this.xml != null) {
                            if (this.neededRoot != null) {
                              if (this.xml.documentElement != null) {
                                if (this.xml.documentElement.tagName != this.neededRoot) {
                                  alert('Nem megfelelõ root-elem. Az elvárt:'+this.neededRoot+'\nA dokumentum:'+this.responseText());
                                  throw new JSCL.Lang.ArgumentException("Invalid document-type.");
                                } else {
                                  if (this.xml.documentElement.getAttribute("cacheable") == "true") {
                                    if (this.urlToCache != null) {
                                      JSCL.Net.XmlCacheObject.put(this.urlToCache, this.dataToCache, this.xml);
                                    }
                                  }
                                }
                              } else {
                                this.openErrorWindow(this.responseText());
                                throw new JSCL.Lang.ArgumentException("Invalid XML-document.");
                              }
                            }
                          } else {
                            this.openErrorWindow(this.responseText());
                            throw new JSCL.Lang.ArgumentException("Invalid XML-document.");
                          }                          
                          break;
                        case this.SOURCETYPE.TEXT :
                          break;
                        case this.SOURCETYPE.NODE :
                          break;
                        case this.SOURCETYPE.EMBEDDED :
                          break;
                        default :
                          throw new JSCL.Lang.ArgumentException("Invalid sourcetype.");
                      }
                      // this.oriXml.setProperty("SelectionLanguage", "XPath");
                    }
                  }
                 )
  ;
;

JSCL.Net.XmlAjax =
  JSCL.Lang.Class("JSCL.Net.XmlAjax",
                  function(publ) {
                    publ.init = function(){
                      this.xml = null;
                      this.neededRoot = null;
                    }
                    publ.xml;
                    publ.neededRoot;

                    publ.openErrorWindow = function(txt) {
                      try {
	                      var popUp = window.open('', 'Error', 'height=400, width=800, menubar=0, resizable=1, scrollbars=1, status=0,titlebar=0,toolbar=0');
  	                    popUp.document.open("text/html");
    	                  popUp.document.writeln(txt);
    	                  popUp.document.close();
    	                } catch (exc) {
    	                  alert(txt);
    	                }
                    }
                    publ.onRetrieveData = function(responseXML) {
                      this.xml = responseXML;
                      if (this.xml != null) {
                        if (this.neededRoot != null) {
                          if (this.xml.documentElement != null) {
                            if (this.xml.documentElement.tagName != this.neededRoot) {
                              alert('Nem megfelelõ root-elem. Az elvárt:'+this.neededRoot+'\nA dokumentum:'+this.responseText());
                              throw new JSCL.Lang.ArgumentException("Invalid document-type.");
                            } else {
                              if (this.xml.documentElement.getAttribute("cacheable") == "true") {
                                if (this.urlToCache != null) {
                                  JSCL.Net.XmlCacheObject.put(this.urlToCache, this.dataToCache, this.xml);
                                }
                              }
                            }
                          } else {
                            this.openErrorWindow(responseXML);
                            throw new JSCL.Lang.ArgumentException("Invalid XML-document.");
                          }
                        }
                      } else {
                        this.openErrorWindow(responseXML);
                        throw new JSCL.Lang.ArgumentException("Invalid XML-document.");
                      }                          
                      // alert(this.xml);
                      kiment(this.xml.documentElement);
                    }
                  }
                 )
  ;
;

JSCL.Net.Xsl =
  JSCL.Lang.Class("JSCL.Net.Xsl", JSCL.Net.Xml,
                  function(publ, supr) {
                    publ.init = function(){
                      supr(this).init();
                    }
                    
                    publ._sourceTypeXsl = publ.SOURCETYPE.URL;
                    publ.xsl = null;

                    publ.loadXsl = function(sourceType, src) {
                      this._sourceTypeXsl = sourceType;
                      var xmlObj = new JSCL.Net.Xml();
                      xmlObj.requestMethod = "GET";
                      xmlObj.setData(sourceType, src);
                      xmlObj.retrieveData();
                      this.xsl = xmlObj.xml;
                      delete xmlObj;
                    }

                    publ.transform = function() {
                      try {
                        kiment(this.xsl);
                        var x = this.xml.transformNode(this.xsl);
                      } catch (ex) {
                       logger.debug("Exception!! " + ex + " typeof thrown object is " + typeof(ex));
                      }
                      return (x);
                    }
                    publ.transformToXml = function() {
                      var x = this.xml.transformNode(this.xsl);
                      var xmlObj = new JSCL.Net.Xml();
                      xmlObj.setData(this.SOURCETYPE.TEXT, x);
                      xmlObj.retrieveData();
                      var xml = xmlObj.xml;
                      delete xmlObj;
                      return (xml);
                    }
                  }
                 )
  ;
;
JSCL.Net.XslAjax =
  JSCL.Lang.Class("JSCL.Net.XslAjax", JSCL.Net.XmlAjax,
                  function(publ, supr) {
                    publ.init = function(){
                      supr(this).init();
                    }                    
                    publ.xsl = null;
                    publ.loadXsl = function(sourceType, src) {
                      this._sourceTypeXsl = sourceType;
                      var xmlObj = new JSCL.Net.Xml();
                      xmlObj.requestMethod = "GET";
                      xmlObj.setData(sourceType, src);
                      xmlObj.retrieveData();
                      this.xsl = xmlObj.xml;
                    }

                    publ.transform = function() {
                      var x = this.xml.transformNode(this.xsl);
                      return (x);
                    }
                    publ.transformToXml = function() {
                      var x = this.xml.transformNode(this.xsl);
                      var xmlObj = new JSCL.Net.Xml();
                      xmlObj.setData(this.SOURCETYPE.TEXT, x);
                      xmlObj.retrieveData();
                      return (xmlObj.xml);
                    }
                  }
                 )
  ;
;
JSCL.Net.Html =
  JSCL.Lang.Class("JSCL.Net.Html", JSCL.Net.HTTP,
                  function(publ, supr) {
                    publ.init = function(){
                      supr(this).init();
                    }
                    publ.SOURCETYPE = {
                      URL : 0, TEXT : 1, NODE : 2
                    };
                    // publ.SOURCETYPE_URL = 0;
                    // publ.SOURCETYPE_TEXT = 1;
                    // publ.SOURCETYPE_XML = 2;
                    publ._sourceType = publ.SOURCETYPE.URL;
                    publ.html = null;

                    publ.setData = function(sourceType, src) {
                      this._sourceType = sourceType;
                      switch (sourceType) {
                        case this.SOURCETYPE.URL :
                          this.URL = src;
                          break;
                        case this.SOURCETYPE.TEXT :
                          this.html = src;
                          break;
                        case this.SOURCETYPE.NODE :
                          this.html = src;
                          break;
                        default :
                          throw new JSCL.Lang.ArgumentException("Invalid sourcetype.");
                      }
                    }

                    publ.retrieveData = function() {
                      switch (this._sourceType) {
                        case this.SOURCETYPE.URL :
                          this.async = false;
                          this.request();
                          this.html = this.responseText();
                          break;
                        case this.SOURCETYPE.TEXT :
                          break;
                        case this.SOURCETYPE.NODE :
                          break;
                        default :
                          throw new JSCL.Lang.ArgumentException("Invalid sourcetype.");
                      }
                    }
                  }
                 )
  ;
;

JSCL.Database.Database =
  JSCL.Lang.Class("JSCL.Database.Database", JSCL.Net.Xml,
                  function(publ, supr) {
                    publ.init = function() {
                      supr(this).init();
                      this.neededRoot = 'Database';
                      this._tables = [];
                    };

                    publ.name = null;
                    publ._tables = null;
                    publ.addTable = function(table) {
                      this._tables.push(table);
                    };
                    publ.retrieveData = function() {
                      supr(this).retrieveData();
                      //kiment(this.xml);
                      var l = this._tables.length;
                      for (var i = 0; i < l; i++) {
                        this._tables[i].invalidate();
                        this._tables[i].filtering();
                      }
                    };
                  }
                 );
JSCL.Database.DatabaseAjax =
  JSCL.Lang.Class("JSCL.Database.DatabaseAjax", JSCL.Net.XmlAjax,
                  function(publ, supr) {
                    publ.init = function() {
                      supr(this).init();
                      this.neededRoot = 'Database';
                      this._tables = [];
                    };

                    publ.name = null;
                    publ._tables = null;
                    publ.addTable = function(table) {
                      this._tables.push(table);
                    };
                    publ.onRetrieveData = function(responseXML) {
                      supr(this).onRetrieveData(responseXML);
                      //kiment(this.xml);
                      var l = this._tables.length;
                      for (var i = 0; i < l; i++) {
                        this._tables[i].invalidate();
                        this._tables[i].filtering();
                      }
                    };
                  }
                 );
JSCL.Database.Datasource =
  JSCL.Lang.Class("JSCL.Database.Datasource",
                  function(publ) {
                    publ.init = function(table, db) {
                      this._listeners = [];
                      this.isItemDS = false;
                      this.filter = null;
                      this._lastFlt = null;
                      this.table = table;
                      this.db = db;
                      this.filtering();
                      this.db.addTable(this);
                    };

                    publ.SORTDIRECTION = {
                      UNSORTED : "U", ASCENDING : "A", DESCENDING : "D"
                    };
                    //                    publ.SORTDIRECTION_UNSORTED = "U";
                    //                    publ.SORTDIRECTION_ASCENDING = "A";
                    //                    publ.SORTDIRECTION_DESCENDING = "D";
                    publ.name = null;
                    publ.table = null;
                    publ.db = null;
                    publ.sortField = null;
                    publ.sortDirection = publ.SORTDIRECTION.UNSORTED;
                    publ.root = "";
                    publ.currentRowId = null;
                    publ.currentRow = null;
                    publ._listeners = null;
                    publ.filter = null;
                    publ.xml = null;
                    publ._lastFlt = null;
                    publ._currPos = null;
                    publ.isItemDS = null;
                    // TODO:
                    // Most mindig az elsõre áll rá!
                    publ.search = function(flt) {
                      return (this.name+'[1]');
                    };
                    publ.getCount = function() {
                      if (this.xml !== null) {
                        var nodes = this.xml.selectNodes('/'+this.table+'/*');
                        return (nodes.length);
                      } else {
                        return (-1);
                      }
                    };
                    publ.goToFirst = function() {
                      this.setPosition(1);
                    };
                    publ.setPosition = function(rowNum) {
                      if (msie) {
                      	// logger.debug(getIEDocumentName());
                        rowNum -= getIEDocumentDiff();
                      }
                      this._currPos = rowNum;
                      this.setRow(this.name+'['+rowNum+']');
                    };
                    publ.setRow = function(rowId) {
                    	// logger.debug("RowId:"+rowId);
                      this.currentRowId = rowId;
                      this.currentRow = this.xml.selectSingleNode('/'+this.table+'/'+rowId);
                      this.onReposition();
                      var l = this._listeners.length;
                      for (var i = 0; i < l; i++) {
                        var comp = this._listeners[i];
                        comp.onReposition();
                      }
                    };
                    publ.onReposition = function() {
                      //
                    };
                    publ.getRow = function(rowId) {
                      this.currentRowId = rowId;
                      this.currentRow = this.xml.selectSingleNode('/'+this.table+'/'+rowId);
                      return (this.currentRow);
                    };
                    publ.getField = function(field) {
                      // logger.debug(field);
                      return (this.getElementText(this.currentRow, field));
                    };
                    publ.clearListeners = function() {
                      this._listeners.Clear();
                    };
                    publ.removeNavigators = function() {
                    	var lelt = false;
                    	var toRemove = null;
                        var l = this._listeners.length;
                        for (var i = 0; i < l; i++) {
                          var comp = this._listeners[i];
                          var x = comp.id;
                          if(!isUndef(x)) {
                        	  if(x.match("^navigator")) {
                        		  lelt = true;
                        		  toRemove = comp;
                        		  break;
                        	  }
                          }
                        }
                        if(lelt) {
                        	this._listeners.Remove(toRemove);
                        }
                    }
                    publ.addListener = function(elem) {
                      var lelt = false;
                      var l = this._listeners.length;
                      for (var i = 0; i < l; i++) {
                        var comp = this._listeners[i];
                        if (elem.id == comp.id) {
                          lelt = true;
                          break;
                        }
                      }
                      if (lelt === false) {
                        this._listeners.push(elem);
                      }
                    };
                    publ.getDS = function() {
                      return (this.xml);
                    };
                    publ.getFullPath = function(node) {
                      if (node !== null) {
                        var p = node.parentNode;
                        if (p === null) {
                          return ("");
                        } else {
                          return (this.getFullPath(p)+"/"+node.nodeName);
                        }
                      } else {
                        return ("");
                      }
                    };
                    function scrapTextNodes(oElem) {
                      var s = "";
                      for (var i = 0; i < oElem.childNodes.length; i++) {
                        var oNode = oElem.childNodes[i];
                        if (oNode.nodeType == 3) {
                          s += oNode.nodeValue;
                        } else if (oNode.nodeType == 1) {
                          s += "\n"+scrapTextNodes(oNode);
                        }
                      }
                      // logger.debug(s)
                      return s;
                    }
                    publ.getElementText = function(node, url) {
                      try {
                        if (node !== null) {
                        	// logger.debug(url);
                          var node2 = node.selectSingleNode(url);
                          if (node2 === null) {
                            throw (new JSCL.Lang.XmlException("Hiányzó tag: <"+this.getFullPath(node)+"/"+url+"/text()>."));
                          } else {
                            return (scrapTextNodes(node2));
                          }
                        } else {
                          // logger.debug("node is null");
                          return ("");
                        }
                      } catch (Ex) {
                        // logger.debug("Step1: "+Ex.message);
                        // throw (new JSCL.Lang.XmlException("Hiányzó tag: <"+this.getFullPath(node)+"/"+url+"/text()>."));
                        return ('');
                      }
                    };
                    publ.setFilter = function(flt) {
                      this.filter = flt;
                      this.filtering();
                    };
                    publ.filtering = function() {
                      if (this.db.xml !== null) {
                        if (this._lastFlt !== this.filter || this.xml === null) {
                          var xslObj = new JSCL.Net.Xsl();
                          xslObj.loadXsl(xslObj.SOURCETYPE.TEXT, this.generateXSL());
                          xslObj.setData(xslObj.SOURCETYPE.NODE, this.db.xml);
                          xslObj.retrieveData();
                          // kiment(xslObj.xsl);
                          // alert(this.filter);
                          delete this.xml;
                          this.xml = xslObj.transformToXml();
                          delete xslObj;
                          xslObj = null;
                          if (developByFigaro) {
                            kiment(this.xml);
                          }
                          var l = this._listeners.length;
                          for (var i = 0; i < l; i++) {
                            var comp = this._listeners[i];
                            if (this.isItemDS === false) {
                              this._listeners[i].onFiltering();
                            } else {
                              this._listeners[i].onItemFiltering();
                            }
                          }
                          this._lastFlt = this.filter;
                        }
                      } else {
                      	delete this.xml;
                        this.xml = null;
                      }
                    };
                    publ.invalidate = function() {
                    	delete this.xml;
                      this.xml = null;
                    };
                    publ.generateXSL = function() {
                      var flt = (this.filter === null) ? this.name : this.name+this.filter;
                      var xslSrc =
                        '<?xml version="1.0" encoding="UTF-8"?>'+
                        '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">'+
                        '<xsl:output method="xml" indent="yes"/>'+
                        ' <xsl:template match="/Database'+this.root+'">'+
                        '  <xsl:element name="'+this.table+'">'+
                        '    <xsl:copy-of select="/Database'+this.root+'/'+this.table+'/'+flt+'" />'+
                        '  </xsl:element>'+
                        ' </xsl:template>'+
                        '</xsl:stylesheet>';
                      // logger.debug(xslSrc);
                      return (xslSrc);
                    };
                  }
                 );
JSCL.Database.MasterDatasource =
  JSCL.Lang.Class("JSCL.Database.MasterDatasource", JSCL.Database.Datasource, 
                  function(publ, supr) {
                    publ.init = function(table, db, DetailSource, KeyFields, DetailFields) {
						this.detailSource = DetailSource;
						this.keyFields = KeyFields;
						this.detailFields = DetailFields;
                    	supr(this).init(table, db);
                    }
                    publ.detailSource;
                    publ.keyFields;
                    publ.detailFields;
					publ.onRecPosition;
										
                    publ.onReposition = function(){
					  if (this.keyFields.length == this.detailFields.length){
            			var filterSrt = "[";
            			for (var i = 0; i < this.keyFields.length; i++){
            				filterSrt = filterSrt + "./" + this.detailFields[i] + "/text() = \'" + this.getField(this.keyFields[i]) + "\'";
            				if (i < this.keyFields.length - 1){
            					filterSrt = filterSrt + " and ";
            				}
            			}
            			filterSrt = filterSrt + "]";
            			//alert(filterSrt);
            			this.detailSource.setFilter(filterSrt); 
            			this.detailSource.setPosition(1);                   			
            		}
                	if (this.onRecPosition){
                		this.onRecPosition();
                	}
                    }
                  }
                 )
  ;
;
JSCL.Database.Errors =
  JSCL.Lang.Class("JSCL.Database.Errors", JSCL.Database.Datasource,
                  function(publ, supr) {
                    publ.init = function(db) {
                      this.name = "Error";
                      supr(this).init("Errors", db);
                    };
                    publ.filtering = function() {
                      supr(this).filtering();
                      if (this.xml !== null) {
                        this.goToFirst();
                      }
                    };
                    publ.getCode = function() {
                      return (this.getField("Code"));
                    };
                    publ.getMessage = function() {
                      return (this.getField("Message"));
                    };
                    publ.isError = function() {
                      return (this.getCount() !== 0);
                    };
                  }
                 );
JSCL.UI.Object =
  JSCL.Lang.Class("JSCL.UI.Object",
                  function(publ) {
                    publ.init = function() {
                    }
                    publ.parent;
                    publ.view;
                    publ.content;
                    publ.calcParent = function(szulo) {
                      if (szulo == null) {
                        this.parent = document.body;
                      } else {
                        if (typeof (szulo) == 'string') {
                          this.parent = document.getElementById(szulo);
                        } else {
                          this.parent = szulo;
                        }
                      }
                    }
                    publ.addEvent = function(eTarget, eh, ep) {
                      // logger.debug("addEvent");
                      if (isUndef(eTarget)) {
                        eTarget = (new JSCL.Events.Listener()).Invoke;
                      } else {
                        if (isUndef(eTarget.jsclName)) {
                          eTarget = (new JSCL.Events.Listener()).Invoke;
                        } else {
                          if (eTarget.jsclName != 'JSCL.Events.Listener') {
                            eTarget = (new JSCL.Events.Listener()).Invoke;
                          }
                        }
                      }
                      if (typeof(eh) == 'string') {
                        eTarget.Add(new Function ("src, ea", eh));
                      } else {
                        eTarget.Add(eh);
                      }
                      if (isUndef(ep) == false) {
                        eTarget.setParameters(ep);
                      }
                    }
                    publ.addText = function(text) {
                      text = text.replace(/\&amp\;/g, "&").replace(/\&lt\;/g, "<").replace(/\&gt\;/g, ">");
                      if (isUndef(this.tipus)) {
                        // logger.debug('addText: '+text);
                        this.content.appendChild(document.createTextNode(text));
                      } else {
                        // logger.debug(this.tipus+'.addText: '+text);
                        if (this.tipus.match(/script/)) {
                          this.content.src = text;
                        } else {
                          this.content.appendChild(document.createTextNode(text));
                        }
                      }
                    }
                    publ.dispose = function() {
                      this.view = null;
                      this.content = null;
                      this.parent = null;
                    }
                  }
                 )
  ;
;
JSCL.UI.Generic =
  JSCL.Lang.Class("JSCL.UI.Generic", JSCL.UI.Object,
                  function(publ, supr) {
                    publ.init = function(tipus, szulo, f) {
                      supr(this).init();
                      // logger.debug(tipus);
                      this.tipus = tipus;
                      this.calcParent(szulo);
                      this.view = document.createElement(tipus.toUpperCase());
                      this.content = this.view;
                      this.parent.appendChild(this.view);
                      for (var i in f) {
                        var c = f[i];
                        // logger.debug("Generic -"+i+" : "+c);
                        if (i != 'style') {
                          if (i == 'classAttr') {
                            addAttribute(this.view, 'class', c);
                          } else {
                            if (i.match(/^on*/)) {
                              i = i.toLowerCase();
                              try {
                                this.view[i] = new Function ("", c);
                              } catch(e) {
                                logger.debug(e.message);
                              }
                            } else {
                              try {
                                this.view[i] = c;
                              } catch(e) {
                                logger.debug(e.message);
                              }
                              addAttribute(this.view, i, c);
                            }
                          }
                        } else {
                          this.view.style.cssText = c;
                        }
                      }
                    }
                    publ.tipus;
                  }
                 )
  ;
;
JSCL.UI.Component =
  JSCL.Lang.Class("JSCL.UI.Component", JSCL.UI.Object,
                  function(publ, supr) {
                    /**
                     Initializes a new Component.
                     @param id
                     */
                    publ.init = function(id, f, kotelezo) {
                      supr(this).init();
                      this.id = id;
                      this.view.id = id;
                      this.view.name = id;
                      addAttribute(this.view, 'name', id);
                      addAttribute(this.view, 'id', id);
                      if (isUndef(kotelezo) == false) {
                        addAttribute(this.view, 'necessity', kotelezo);
                        this.view.necessity = kotelezo; // !!!!!!! A banki koncepcio miatt tiltva !!!!!!!
                        // this.view.necessity = '0';
                      } else {
                        addAttribute(this.view, 'necessity', false);
                        this.view.necessity = '0';
                      }
                      this.initEvents();
                      this.ieHack(this.view);
                      for (var i in f) {
                        if (i != 'id') {
                          var c = f[i];
                          // logger.debug("-"+i+" : "+c);
                          if (i.match(/^style\_*/)) {
                            this.view.style[i.replace(/^style\_*/, "")] = c;
                          } else {
                            if (i.match(/^on*/)) {
                             //
                            } else {
                              // logger.debug("Attribute");
                              try {
                            	  this.view[i] = c;
                              } catch (ex) {
                            	  alert(ex);
                              }
                              addAttribute(this.view, i, c);
                              if(i == "disabled" || i == "enabled") {
                            	  setDisabledCSS(this.view, this.view.disabled)
                              }
                            }
                          }
                        }
                      }
                      // alert(this.view.name);
                    }
                    publ.FIELD_VALIDATION = false;
                    publ.id;
                    publ.setValue = function(value) {
                      this.view.value = value;
                    }
                    publ.getValue = function() {
                      this.view.value = this.view.value.toUpperCase();
                      return (this.view.value);
                    }
                    publ.getId = function() {
                      return (this.id);
                    }
                    publ.ieHack = function(node) {
                      if (msie && !msie70 && !msie80) {
                        node.onfocus.Add(function(src, ea) {
                          if (typeof(src.className) == 'undefined') {
                            src.className = "";
                          }
                          src.className+=" ratefocus";
                        });
                        node.onblur.Add(function(src, ea) {
                          src.className=src.className.replace(new RegExp(" ratefocus\\b"), "");
                        });
                        node.onmouseover.Add(function(src, ea) {
                          if (typeof(src.className) == 'undefined') {
                            src.className = "";
                          }
                          src.className+=" ratehover";
                        });
                        node.onmouseout.Add(function(src, ea) {
                          src.className=src.className.replace(new RegExp(" ratehover\\b"), "");
                        });
                      }
                    }
                    publ.onValidate = function() {
                      return (true);
                    }
                    publ.getDisabled = function() {
                      return (this.view.disabled);
                    }
                    publ._ftp = function(src){
                      if (src.className == "tab-page") {
                        return src;
                      }
                      if (src.parentNode == null) {
                        return null;
                      }
                      return this._ftp(src.parentNode);
                    }
                    publ.findTabPage = function(){
                      return (this._ftp(parent));
                    }
                    publ.onNecessity = function() {
                      if (this.view.necessity == '0' || this.view.necessity == '') {
                      } else {
                        if (this.view.necessity == 'I') {
                        } else {
                          if (this.getDisabled() == false) {
                            if (this.view.necessity == '3') {
                              if (this.getValue() == '') {
                                alert("Kötelezõ adat!");
                                var act = this.findTabPage();
                                if (act != null) {
                                  act.jsObject.select();
                                }
                                this.view.focus();
                                throw new JSCL.Events.RevokeException("Hiba");
                              }
                            }
                          }
                        }
                      }
                    }
                    publ.setEnterStep = function() {
                      this.view.onkeydown.Add(function(src, ea) {
                        if (isUndef(window.event) == false) {
                          if (event.keyCode) {
                            if (event.keyCode == 13) {
                              event.keyCode = 9;
                            }
                          } else {
                            if (event.which) {
                              if (event.which == 13) {
                                event.which = 9;
                              }
                            }
                          }
                        }
                      });
                    }
                    publ.initEvents = function() {
                      this.view.onclick = (new JSCL.Events.Listener()).Invoke;
                      this.view.onfocus = (new JSCL.Events.Listener()).Invoke;
                      this.view.onblur = (new JSCL.Events.Listener()).Invoke;
                      this.view.onmouseover = (new JSCL.Events.Listener()).Invoke;
                      this.view.onmouseout = (new JSCL.Events.Listener()).Invoke;
                      this.view.onbeforedeactivate = (new JSCL.Events.Listener()).Invoke;
                      this.view.onchange = (new JSCL.Events.Listener()).Invoke;
                      this.view.onkeydown = (new JSCL.Events.Listener()).Invoke;
                      this.view.onkeyup = (new JSCL.Events.Listener()).Invoke;
                    }
                  }
                 )
  ;
;
JSCL.UI.TComponent =
  JSCL.Lang.Class("JSCL.UI.TComponent",
                  function(publ) {
                    /**
                     Initializes a new Component.
                     @param id           
                     */
                    publ.init = function(id, f) {
                      this.id = id;
                      this.name = id;
                      for (var i in f) {
                        var c = f[i];
                        //logger.debug("-"+i+" : "+c);
                        this.view[i] = c;
                      }
                    }

                    publ.id;
                    publ.view;
                  }
                 )
  ;
;
JSCL.UI.Container =
  JSCL.Lang.Class("JSCL.UI.Container", JSCL.UI.Object,
                  function(publ, supr) {
                    /**
                     Initializes a new Container.
                     */
                    publ.init = function(f) {
                      supr(this).init();
                      for (var i in f) {
                        var c = f[i];
                        // logger.debug("-"+i+" : "+c);
                        this[i] = c;
                      }
                    }
                    publ.add = function(e) {
                      this.content.appendChild(e.view);
                    }
                  }
                 )
  ;
;
JSCL.UI.DBComponent =
  JSCL.Lang.Class("JSCL.UI.DBComponent", JSCL.UI.Component,
                  function(publ, supr) {
                    /**
                     Initializes a new DBComponent.
                     @param id
                     @param f
                     */
                    publ.init = function(id, f, kotelezo) {
                      supr(this).init(id, f, kotelezo);
                      this.field = f.field;
                    }
                    publ.field;
                    publ.datasource;
                    publ.setData = function(ds) {
                      if (typeof(ds) != 'undefined') {
                        this.datasource = ds;
                        this.datasource.addListener(this);
                      }
                    }
                    publ.onFiltering = function() {
                      //
                    }
                    
                    publ.getDBField = function() {
                      return this.field;
                    }
                    
                  }
                 )
  ;
;
JSCL.UI.TDBComponent =
  JSCL.Lang.Class("JSCL.UI.TDBComponent", JSCL.UI.TComponent,
                  function(publ, supr) {
                    /**
                     Initializes a new DBComponent.
                     @param id
                     @param f
                     */
                    publ.init = function(id, f) {
                      supr(this).init(id, f);
                    }
                    publ.field;
                    publ.datasource;
                    publ.setData = function(ds) {
                      this.datasource = ds;
                      this.datasource.addListener(this);
                    }
                  }
                 )
  ;
;
JSCL.UI.Form =
  JSCL.Lang.Class("JSCL.UI.Form", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f) {
                      this.calcParent(szulo);
                      this.view = document.createElement("DIV");
                      this.view.id = id;
                      this.view.name = id;
                      addAttribute(this.view, 'name', id);
                      addAttribute(this.view, 'id', id);
                      this.parent.appendChild(this.view);
                      this.content = this.view;
                      this.view.jsObject = this;
                      this._listeners = [];
                    }
                    publ._listeners;
                    publ.clearListeners = function() {
                      this._listeners.Clear();
                    }
                    publ.addField = function(elem) {
                      this._listeners.push(elem);
                    }
                    publ.getFields = function() {
                      return (this._listeners);
                    }
                    publ.getFieldValue = function(azon) {
                      var len = this._listeners.length;
                      for (var j = 0; j < len; j++) {
                        var field = this._listeners[j];
                        if (azon == field.getId()) {
                          return (field.getValue());
                        }
                      }
                      return ("");
                    }
                  }
                 )
  ;
;
JSCL.UI.Window =
  JSCL.Lang.Class("JSCL.UI.Window", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f) {
                      supr(this).init(f);
                      this.view = document.createElement("DIV");
                      addAttribute(this.view, 'class', 'wview');
                      this.calcParent(szulo);
                      this.parent.appendChild(this.view);
                      var eTop = document.createElement("B");
                      addAttribute(eTop, 'class', 'top');
                      this.view.appendChild(eTop);                      
                      var eB1 = document.createElement("B");
                      addAttribute(eB1, 'class', 'b1');
                      eTop.appendChild(eB1);
                      var eB2 = document.createElement("B");
                      addAttribute(eB2, 'class', 'b2');
                      eTop.appendChild(eB2);
                      var eB3 = document.createElement("B");
                      addAttribute(eB3, 'class', 'b3');
                      eTop.appendChild(eB3);
                      var eB4 = document.createElement("B");
                      addAttribute(eB4, 'class', 'b4');
                      eTop.appendChild(eB4);
                      this.fejlec = document.createElement("DIV");
                      this.view.appendChild(this.fejlec);
                      if (typeof (this.caption) != 'undefined') {
                        this.fejlec.appendChild(document.createTextNode(this.caption));
                      } else {
                        this.fejlec.appendChild(document.createTextNode(""));
                      }                      
                      this.fejlec.jsObject = this;
                      if (this.moveable.toUpperCase().match(/^TRUE/)) {
                        this.fejlec.onmousedown = (new JSCL.Events.Listener()).Invoke;
                        this.fejlec.onmousedown.Add(function(src, ea) {
                          dragStart(ea.event, src.jsObject.view);
                        });                        
                        addAttribute(this.fejlec, 'class', 'fejlec moveable');
                      } else {
                        addAttribute(this.fejlec, 'class', 'fejlec notmoveable');
                      }
                      if (typeof (this.help) != 'undefined') {
                        addAttribute(this.fejlec, 'title', this.help);
                      }
                      this.content = document.createElement("DIV");
                      this.content.name = id;
                      this.content.id = id;
                      addAttribute(this.content, 'name', id);
                      addAttribute(this.content, 'id', id);
                      addAttribute(this.content, 'class', 'window');
                      this.view.appendChild(this.content);
                      var eBottom = document.createElement("B");
                      addAttribute(eBottom, 'class', 'bottom');
                      this.view.appendChild(eBottom);                      
                      var eB4 = document.createElement("B");
                      addAttribute(eB4, 'class', 'b4');
                      eBottom.appendChild(eB4);
                      var eB3 = document.createElement("B");
                      addAttribute(eB3, 'class', 'b3');
                      eBottom.appendChild(eB3);
                      var eB2 = document.createElement("B");
                      addAttribute(eB2, 'class', 'b2');
                      eBottom.appendChild(eB2);
                      var eB1 = document.createElement("B");
                      addAttribute(eB1, 'class', 'b1');
                      eBottom.appendChild(eB1);
                      
                      this.content.jsObject = this;                                            
                    }
                    publ.content;
                    publ.fejlec;
                    publ.dispose = function() {
                    	supr(this).dispose();
                    	this.fejlec = null;
                    }
                  }
                 )
  ;
;
JSCL.UI.Fields =
  JSCL.Lang.Class("JSCL.UI.Fields", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.view = document.createElement("FIELDSET");
                      this.calcParent(szulo);
                      this.parent.appendChild(this.view);
                      if (isUndef(this.title) == false) {
                        var vLegend = document.createElement("LEGEND");
	                      vLegend.appendChild(document.createTextNode(this.title));
                        this.view.appendChild(vLegend);
	                  } else {
	                	  this.view.style.cssText = this.view.style.cssText + ';' + 'border: none;'; 
	                  }
                      var vTable = document.createElement("TABLE");
                      this.view.appendChild(vTable);
                      this.content = document.createElement("TBODY");
                      vTable.appendChild(this.content);
                    }
                  }
                 )
  ;
;
if (oneColSettings) {
JSCL.UI.Row =
  JSCL.Lang.Class("JSCL.UI.Row", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = this.parent;
                      this.content = this.view;
                    }
                  }
                 )
  ;
;
} else {
JSCL.UI.Row =
  JSCL.Lang.Class("JSCL.UI.Row", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.view = document.createElement("TR");
                      this.calcParent(szulo);
                      this.parent.appendChild(this.view);
                      this.content = this.view;
                    }
                  }
                 )
  ;
;
}
if (oneColSettings) {
JSCL.UI.Field =
  JSCL.Lang.Class("JSCL.UI.Field", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = document.createElement("TR");
                      var labelElem = document.createElement("TD");
                      addAttribute(labelElem, 'class', 'addedLabel');
                      this.parent.appendChild(this.view);
                      this.view.appendChild(labelElem);
                      var cimke = document.createElement("LABEL");
                      labelElem.appendChild(cimke);
                      if (isUndef(this.necessity) == false) {
                        switch (this.necessity) {
                          case '0' :
                            break;
                          case '' :
                            break;
                          case 'I' :
                            addAttribute(cimke, 'class', 'important');
                            break;
                          default:
                            addAttribute(cimke, 'class', 'required');
                            break;
                        }
                      }
                      addAttribute(cimke, 'for', this.id);
                      addAttribute(cimke, 'id', 'labelfor_' + this.id);
                      if (typeof(this.caption) != 'undefined') {
                        cimke.appendChild(document.createTextNode(this.caption));
                      } else {
                        cimke.appendChild(document.createTextNode(" "));
                      }
                      this.content = document.createElement("TD");
                      this.view.appendChild(this.content);
                      if (typeof(this.title) != 'undefined') {
                        addAttribute(labelElem, 'title', this.title);
                        addAttribute(this.content, 'title', this.title);
                      }
                      if (typeof(f.help) != 'undefined') {
                        addAttribute(labelElem, 'title', f.help);
                        addAttribute(this.content, 'title', f.help);
                      }
                    }
                  }
                 )
  ;
;
} else {
	if (twoRowsSettings) {
JSCL.UI.Field =
  JSCL.Lang.Class("JSCL.UI.Field", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = document.createElement("TD");
                      this.parent.appendChild(this.view);
                      var cimke = document.createElement("LABEL");
                      this.view.appendChild(cimke);
                      try {
                    	  if(isUndef(f.colspan)) {
                    		  /* pupupsearchgrid-es komponensek */
                    		  f.colspan = 1;
                    	  }
	                      if(f.colspan == 1) {
	                    	  var a = Math.round(parseInt(document.getElementById('TartalomFrame').offsetWidth) / f.colnum);
	                    	  //addAttribute(this.view, 'style', ("width: " + a + "px"));
	                    	  // OK in FF, err in IE
	                    	  this.view.style.cssText = this.view.style.cssText + ';width: ' + a + 'px;';
	                      } else {
	                    	  //addAttribute(this.view, 'colSpan', f.colspan);
	                    	  this.view.colSpan = f.colspan;
	                      }
                      } catch (ex) {
                    	  window.alert("FieldError: " + ex);
                    	  
                      }
                      if (isUndef(this.necessity) == false) {
                        switch (this.necessity) {
                          case '0' :
                            break;
                          case '' :
                            break;
                          case 'I' :
                            addAttribute(cimke, 'class', 'important');
                            break;
                          default:
                            addAttribute(cimke, 'class', 'required');
                            break;
                        }
                      }
                      addAttribute(cimke, 'for', this.id);
                      addAttribute(cimke, 'id', 'labelfor_' + this.id);
                      if (typeof(this.caption) != 'undefined') {
                        cimke.appendChild(document.createTextNode(this.caption));
                      } else {
                        cimke.appendChild(document.createTextNode(" "));
                      }
                      this.content = this.view;
                      if (isUndef(f.colspan) == false) {
                        this.content.colSpan = f.colspan;
                      }
                      if (isUndef(this.title) == false) {
                        addAttribute(this.view, 'title', this.title);
                        addAttribute(this.content, 'title', this.title);
                      }
                      if (isUndef(f.help) == false) {
                        addAttribute(this.view, 'title', f.help);
                        addAttribute(this.content, 'title', f.help);
                      }
                      if (isUndef(f.sugo) == false) {
                      	this.sugoId = f.sugo;
                        var embDiv = document.createElement("SPAN");
                        embDiv.appendChild(document.createTextNode("  "));
                        cimke.appendChild(embDiv);
                        var sugoImg = document.createElement("IMG");
                        var sugoImgId = this.id+"Img";
                        sugoImg.id = sugoImgId;
                        sugoImg.name = sugoImgId;
                        addAttribute(sugoImg, 'name', sugoImgId);
                        addAttribute(sugoImg, 'id', sugoImgId);
                        sugoImg.src = "files/qm2.gif";
                        sugoImg.style.cursor = "hand";
                        sugoImg.jsObject = this;
                        sugoImg.onclick = (new JSCL.Events.Listener()).Invoke;
                        sugoImg.onclick.Add(function(src, ea) {
                        	src.jsObject.hint.show(src.jsObject.view);
                        });
                        cimke.appendChild(sugoImg);
                        this.hint = new JSCL.UI.Hint(this.sugoId, this.id+"Hint");
                      }
                    }
                  }
                 )
  ;
;
} else {
JSCL.UI.Field =
  JSCL.Lang.Class("JSCL.UI.Field", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = document.createElement("TD");
                      addAttribute(this.view, 'class', 'addedLabel');
                      this.parent.appendChild(this.view);
                      var cimke = document.createElement("LABEL");
                      this.view.appendChild(cimke);
                      if (isUndef(this.necessity) == false) {
                        switch (this.necessity) {
                          case '0' :
                            break;
                          case '' :
                            break;
                          case 'I' :
                            addAttribute(cimke, 'class', 'important');
                            break;
                          default:
                            addAttribute(cimke, 'class', 'required');
                            break;
                        }
                      }
                      addAttribute(cimke, 'for', this.id);
                      if (typeof(this.caption) != 'undefined') {
                        cimke.appendChild(document.createTextNode(this.caption));
                      } else {
                        cimke.appendChild(document.createTextNode(" "));
                      }
                      this.content = document.createElement("TD");
                      this.parent.appendChild(this.content);
                      if (typeof(this.colspan) != 'undefined') {
                        addAttribute(this.content, 'colspan', parseInt(this.colspan)*2-1);
                      }
                      if (typeof(this.title) != 'undefined') {
                        addAttribute(this.view, 'title', this.title);
                        addAttribute(this.content, 'title', this.title);
                      }
                      if (typeof(f.help) != 'undefined') {
                        addAttribute(this.view, 'title', f.help);
                        addAttribute(this.content, 'title', f.help);
                      }
                    }
                  }
                 )
  ;
;
}
}
JSCL.UI.TabPane =
  JSCL.Lang.Class("JSCL.UI.TabPane", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = document.createElement("DIV");
                      if (typeof (this.level) != 'undefined') {
                      	this.classNameTag = this.level+this.classNameTag;
                      }
                     	this.view.className = this.classNameTag+' tab-pane';
                      this.parent.appendChild(this.view);                      
                      this.state = 0;
											this.tabBtn = document.createElement("DIV");
											this.tabBtn.className = 'tab-btn';
											this.tabBtn.jsObject = this;
                      this.tabBtn.onclick = (new JSCL.Events.Listener()).Invoke;
                      this.tabBtn.onclick.Add(function(src, ea) { 
                        src.jsObject.onClick();
                      });                      											
											this.view.appendChild(this.tabBtn);
											this.tabBtn.appendChild(document.createTextNode('\u25BD'));
											this.tabRow = document.createElement("DIV");
											this.tabRow.className = 'tab-row';
											this.view.appendChild(this.tabRow);
                      this.content = this.view;
                      this.selectedIndex = 0;
                      this.pages = [];
                      this.tabs = [];
                    }
                    publ.addTabPage = function(tp) {
                    	tp.pageIndex = this.pages.length;
                    	tp.pane = this;
                    	this.pages[tp.pageIndex] = tp;
                    	this.tabs[tp.pageIndex] = tp.tab;
                    	this.tabRow.appendChild(tp.tab);
                    	if (tp.pageIndex == this.selectedIndex) {
                    		tp.show();
                    	} else {
                    		tp.hide();
                    	}
                    }
										publ.setSelectedIndex = function(n) {
											if (this.selectedIndex != n && this.state == 0) {
												if (this.selectedIndex != null && this.pages[this.selectedIndex] != null) {
													this.pages[this.selectedIndex].hide();
												}
												this.selectedIndex = n;
												this.pages[this.selectedIndex].show();
											}
										}                    
                    publ.dispose = function() {
                    	supr(this).dispose();
                    	this.tabs = null;
                    	this.tabRow = null;
                    	this.tabBtn.jsObject = null;
                    	this.tabBtn.onclick = null;
                    	this.tabBtn = null;
                    	
                    }                   
                    publ.onClick = function() {
                    	switch (this.state) {
                    		case 0:
                    		  this.tabBtn.innerText = '\u25B3';
                    		  var l = this.tabs.length;
                    		  for (var i = 0; i < l; i++) {
                    		  	// alert(this.tabs[i].innerText);
                    		  	this.pages[i].view.insertBefore(this.tabs[i], this.pages[i].view.firstChild);
                    		  	this.pages[i].show();
                    		  }
                    		  this.selectedIndex = 0;
                    			break;
                    		case 1:
                    		  this.tabBtn.innerText = '\u25BD';
                    		  var l = this.tabs.length;
                    		  for (var i = 0; i < l; i++) {
                    		  	// alert(this.tabs[i].innerText);
			                      this.tabRow.appendChild(this.tabs[i]);
			                    	if (i == this.selectedIndex) {
			                    		this.pages[i].show();
			                    	} else {
			                    		this.pages[i].hide();
			                    	}                    			
                    		  }                    		  
		                    	break;
                    	}
                    	this.state = Math.abs(this.state-1);                    	
                    }
                    publ.pages = null;
                    publ.tabs = null;
                    publ.selectedIndex = 0;
                    publ.state = 0;
                    publ.classNameTag = "dynamic-tab-pane-control";
                  }
                 )
  ;
;
JSCL.UI.TabPage =
  JSCL.Lang.Class("JSCL.UI.TabPage", JSCL.UI.Container,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init(f);
                      this.calcParent(szulo);
                      this.view = document.createElement("DIV");
                      this.view.className = 'tab-page';
                      this.view.jsObject = this;
                      this.parent.appendChild(this.view);
                      this.tab = document.createElement("H2");
                      this.tab.className = 'tab-head';
                      this.view.appendChild(this.tab);
                      this.aElement = document.createElement("A");
                      this.aElement.href = "#";
                      this.aElement.className = "tabA";
                      this.aElement.onclick = function () { return false; };
                      this.tab.appendChild(this.aElement);
                      if (typeof (this.caption) != 'undefined') {
                        this.aElement.appendChild(document.createTextNode(this.caption));
                      } else {
                        this.aElement.appendChild(document.createTextNode(""));
                      }
                      this.tab.jsObject = this;
                      this.tab.onclick = (new JSCL.Events.Listener()).Invoke;
                      this.tab.onclick.Add(function(src, ea) {
                        src.jsObject.select();
                      });
                      this.content = this.view;
                    }
                    publ.aElement = null;
                    publ.tab = null;
                    publ.show = function() {
                      var el = this.tab;
                      var s = el.className+" selected";
                      s = s.replace(/ +/g, " ");
                      el.className = s;
                      this.view.style.display = "block";
                    }
                    publ.hide = function() {
                      var el = this.tab;
                      var s = el.className;
                      s = s.replace(/ selected/g, "");
                      el.className = s;
                      this.view.style.display = "none";
                    }
                    publ.select = function() {
                      this.pane.setSelectedIndex(this.pageIndex);
                    }
                    publ.dispose = function() {
                      supr(this).dispose();
                      this.aElement = null;
                      this.tab = null;
                    }
                  }
                 )
  ;
;
JSCL.UI.Parameter =
  JSCL.Lang.Class("JSCL.UI.Parameter", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      var elem = document.getElementById(id);
                      if (elem == null) {
                        this.view = document.createElement("INPUT");
                        this.view.type = "hidden";
                        this.view.name = id;
                        this.view.id = id;
                        this.view.jsObject = this;
                        this.parent.appendChild(this.view);
                      } else {
                        this.view = elem;
                      }
                      supr(this).init(id, f, kotelezo);
                      this.view.value = f.value;
                      elem = null;
                    }

                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.Tablegrid =
  JSCL.Lang.Class("JSCL.UI.Tablegrid", JSCL.UI.TDBComponent,
                  function(publ, supr) {
                    publ.init = function(id){
                      this.selectedRows = new Array();
                      this.error = '';
                      /* events */
                      this.onresize = null;
                      this.onsort = null;
                      /* private properties */
                      this._container = null;
                      this._eCont = null;
                      this._eHead = null;
                      this._eBody = null;
                      this._eHeadTable = null;
                      this._eBodyTable = null;
                      this._eHeadCols = null;
                      this._eBodyCols = null;
                      this._activeHeaders = null;
                      this._aType = null;
                      this._rows = 0;
                      this._cols = 0;
                      this._inSortingOperation = false;
                      this.sortCol = -1;
                      this.sortDescending = 0;

                      this.width = "100%";
                      this.height = "100%";
                      this.datasource = null;

                      this.columnsResize = true;
                      this.columnsResizeBody = false;
                      this.rowsColorEven = true;
                      supr(this).init(id);
                    }

                    var IMG_DESC = 'lib/images/desc.png';
                    var IMG_ASC  = 'lib/images/asc.png';

                    var TYPE_NUMERIC = 0;
                    var TYPE_STRING  = 1;

                    var SORT_ASCENDING  = 0;
                    var SORT_DESCENDING = 1;

                    publ.error;
                    publ.selectedRows;
                    /* events */
                    publ.onresize;
                    publ.onsort;
                    /* private properties */
                    publ._container;
                    publ._eCont;
                    publ._eHead;
                    publ._eBody;
                    publ._eHeadTable;
                    publ._eBodyTable;
                    publ._eHeadCols;
                    publ._eBodyCols;
                    publ._activeHeaders;
                    publ._aType;
                    publ._rows;
                    publ._cols;

                    publ.sortCol;
                    publ.sortDescending;

                    publ.width;
                    publ.height;

                    publ.columnsResize;
                    publ.columnsResizeBody;
                    publ.columnsCount;
                    publ.COLUMNS = {
                      "Head" : 0,
                      "Data" : 1,
                      "Type" : 2
                    };
                    publ.columnsHead = function(i) {
                      return "Column"+i;
                    };
                    publ.columnsData = function(i) {
                      return null;
                    };
                    publ.columnsType = function(i) {
                      return "String";
                    };
                    publ.columnsWidth = function(i) {
                      return null;
                    }
                    publ.columnClassification = function(i) {
                      return "";
                    }
                    publ.rowClassification = function() {
                      return ({XPath : "", Classification : ""});
                    }
                    publ.rowsColorEven;
                    publ.rowsOnSelect = function(i) {
                      this.datasource.setRow(this.getRowid(i));
                    };
                    publ.onClearSelection = function() {
                      this.datasource.setPosition(-1);
                    }
                    publ.onReposition = function() {
                      //
                    };
                    publ.onFiltering = function() {
                      if (this._container != null) {
                        this.generate(this._container, 'Filter');
                      }
                      //
                    };
                    publ.bind = function(eCont, eHead, eBody) {
                      try {
                        this._eCont = eCont;
                        this._eHead = eHead;
                        this._eBody = eBody;
                        this._eHeadTable = this._eHead.getElementsByTagName('table')[0];
                        this._eBodyTable = this._eBody.getElementsByTagName('table')[0];
                        this._eHeadCols = this._eHeadTable.tBodies[0].rows[0].cells;
                        this._eBodyCols = this._eBodyTable.tBodies[0].rows[0].cells;
                      } catch(oe) {
                        this.error = 'Unable to bind to elements: '+oe.message;
                        return 1;
                      }
                      if (this._eHeadCols.length != this._eBodyCols.length) {
                        this.error = 'Unable to bind to elements: Number of columns in header and body does not match.';
                        return 2;
                      }
                      this._cols = this._eHeadCols.length;
                      this._rows = this._eBodyTable.tBodies[0].rows.length;
                      this._init();
                      return 0;
                    };

                    /*
                     * iError = setData(eBody)
                     * Binds column list to an existing HTML structure. Use create
                     * to generate the strucutr automatically.
                     */
                    publ.bindToData = function(eBody) {
                      try {
                        this._eBody = eBody;
                        this._eBodyTable = this._eBody.getElementsByTagName('table')[0];
                        this._eBodyCols = this._eBodyTable.tBodies[0].rows[0].cells;
                      } catch(oe) {
                        this.error = 'Unable to bind to elements: '+oe.message;
                        return 1;
                      }
                      if (this._eHeadCols.length != this._eBodyCols.length) {
                        this.error = 'Unable to bind to elements: Number of columns in header and body does not match.';
                        return 2;
                      }
                      this._eBodyCols = this._eBodyTable.tBodies[0].rows[0].cells;
                      this._rows = this._eBodyTable.tBodies[0].rows.length;
                      if (this._eCont.offsetWidth >= 4) {
                        /* Size body */
                        var h = this._eCont.clientHeight-this._eHead.offsetHeight-2;
                        if (h >= 0) {
                          this._eBody.style.height = h+'px';
                        }
                        this._eBody.style.width = this._eCont.offsetWidth-4+'px';
                        this._eBody.style.paddingTop = this._eHead.offsetHeight+'px';
                        this._eBodyTable.style.width = this._eBody.clientWidth+'px';
                      }
                      this._eBody.onscroll = function() {
                        oThis._eHead.scrollLeft = oThis._eBody.scrollLeft;
                      };
                      if (this.rowsColorEven) {
                        this._colorEvenRows();
                      }
                      this._stl = new JSCL.UI.SortableTable(this._eBodyTable);
                      return 0;
                    };

                    /*
                     * void _init(iWidth, iHeight)
                     * Initializes column list, called by create and bind
                     */
                    publ._init = function(iWidth, iHeight) {
                      if (navigator.product == 'Gecko') {
                        /*
                         Mozilla does not allow the scroll* properties of containers with the
                         overflow property set to 'hidden' thus we'll have to set it to
                         '-moz-scrollbars-none' which is basically the same as 'hidden' in IE,
                         the container has overflow type 'scroll' but no scrollbars are shown.
                         */
                        for (var n = 0; n < document.styleSheets.length; n++) {
                          if (document.styleSheets[n].href != null && document.styleSheets[n].href.indexOf('columnlist.css') == -1) {
                            continue;
                          }
                          var rules = document.styleSheets[n].cssRules;
                          for (var i = 0; i < rules.length; i++) {
                            if ((rules[i].type == CSSRule.STYLE_RULE) && (rules[i].selectorText == '.tablegrid-head')) {
                              rules[i].style.overflow = '-moz-scrollbars-none';
                            }
                          }
                        }
                      }
                      this._sizeBodyAccordingToHeader();
                      this.calcSize();
                      this._assignEventHandlers();
                      if (this.rowsColorEven) {
                        this._colorEvenRows();
                      }
                      this._stl = new JSCL.UI.SortableTable(this._eBodyTable);
                      var _aTypes = new Array();
                      for (i = 0; i < this._cols; i++) {
                        _aTypes[i] = this.columnsType(i);
                      }
                      this.setSortTypes(_aTypes);
                    }

                    /*
                     * void _assignEventHandlers()
                     * Assigns event handlers to the grid elements, called by bind.
                     */
                    publ._assignEventHandlers = function() {
                      var oThis = this;
                      this._eCont.onclick = function(e) {
                        oThis._click(e);
                      }
                      if (this.columnsResize) {
                        this._eCont.onmousedown = function(e) {
                          oThis._mouseDown(e);
                        }
                        this._eCont.onmousemove = function(e) {
                          oThis._mouseMove(e);
                        }
                      }
                      this._eCont.onmouseup   = function(e) {
                        oThis._mouseUp(e);
                      }
                      this._eCont.onselectstart = function(e) {
                        return false;
                      }
                      this._eBody.onscroll = function() {
                        oThis._eHead.scrollLeft = oThis._eBody.scrollLeft;
                      };
                      this._eCont.onkeydown = function(e) {
                        var el = (e) ? e.target : window.event.srcElement;
                        var key = (e) ? e.keyCode : window.event.keyCode;
                        if (oThis._handleRowKey(key)) {
                          return;
                        }
                        if (window.event) {
                          window.event.cancelBubble = true;
                        } else {
                          e.preventDefault();
                          e.stopPropagation()
                        }
                        return false;
                      };
                      if (navigator.product != 'Gecko') {
                        var eRows = this._eBodyTable.tBodies[0].rows;
                        var len = eRows.length;
                        for (i = 0; i < len; i++) {
                          this.HoverElement(eRows[i]);
                        }
                        var eHeadCols = this._eHeadTable.tBodies[0].rows[0].cells;
                        var hlen = eHeadCols.length;
                        for (i = 0; i < hlen; i++) {
                          this.HoverElement(eHeadCols[i]);
                        }
                      }
                    };

                    publ.HoverElement = function(node) {
                      if(!node.hovers) node.hovers = {};
                      if(node.hovers['onhover']) return;
                      node.hovers['onhover'] = true;
                      node.attachEvent('onmouseover',
                                       function() { node.className += ' ratehover'; });
                      node.attachEvent('onmouseout',
                                       function() { node.className =
                                         node.className.replace(new RegExp('\\s+'+'ratehover', 'g'),''); });
                    }

                    /*
                     * void setTypes(aTypes)
                     * Sets the column types to the values supplied in the array
                     * Valid types are: TYPE_NUMERIC, TYPE_STRING.
                     * Affects how the column is sorted.
                     */
                    publ.setTypes = function(a) {
                      this._aType = a;
                    };

                    /* void calcSize()
                     * Used to calculate the desired size of the grid and size it accordingly.
                     */
                    publ.calcSize = function() {
                      if (this._eCont.offsetWidth >= 4) {
                        /* Size body */
                        //var h = this._eCont.clientHeight-this._eHead.offsetHeight-2;
                        var h = this._eCont.clientHeight-2;
                        if (navigator.product == 'Gecko') {
                          h = h-this._eHead.offsetHeight;
                        }
                        if (h >= 0) {
                          this._eBody.style.height = h+'px';
                        }
                        this._eBody.style.width = this._eCont.offsetWidth-4+'px';
                        this._eBody.style.paddingTop = this._eHead.offsetHeight+'px';
                        this._eBodyTable.style.width = this._eBody.clientWidth+'px';
                        if (this._eBodyCols) {
                          var length = this._eBodyCols.length;
                          for (var i = 0; i < length; i++) {
                            // alert(this._eBodyCols[i].offsetWidth-4+'<->'+this._eHeadCols[i].offsetWidth);
                            /*if (this._eBodyCols[i].offsetWidth-4 > this._eHeadCols[i].offsetWidth) {
                              this._eHeadCols[i].style.width = (this._eBodyCols[i].offsetWidth-4)+'px';
                            } else {
                              this._eBodyCols[i].style.width = (this._eHeadCols[i].offsetWidth+4)+'px';
                              }*/
                            if (this._eBodyCols[i].offsetWidth > this._eHeadCols[i].offsetWidth) {
                              this._eHeadCols[i].style.width = (this._eBodyCols[i].offsetWidth)+'px';
                            } else {
                              this._eBodyCols[i].style.width = (this._eHeadCols[i].offsetWidth)+'px';
                            }
                          }
                        }
                        /* Size header */
                        var bNoScrollbar = ((this._eBody.offsetWidth-this._eBody.clientWidth) == 2);
                        // bNoScrollbar = false;
                        this._eHeadTable.style.width = this._eHead.style.width = this._eBody.clientWidth+((bNoScrollbar) ? 2 : 0)+'px';
                        /* Size columns */
                      }
                      this._eHeadTable.style.width = 'auto';
                    };

                    /*
                     * iErrorCode = selectRow(iRowIndex)
                     * Selects the row identified by the sequence number supplied,
                     *
                     */
                    publ.selectRow = function(iRowIndex) {
                      if ((iRowIndex < 0) || (iRowIndex > this._rows-1)) {
                        this.error = 'Unable to select row, index out of range.';
                        return 1;
                      }
                      var eRows = this._eBodyTable.tBodies[0].rows;
                      var bSelect = true;
                      /* Normal click */
                      /* Deselect previously selected rows */
                      // alert(this.selectedRows.length);
                      while (this.selectedRows.length) {
                        // eRows[this.selectedRows[0]].className = (this.selectedRows[0] & 1) ? 'odd' : 'even';
                        eRows[this.selectedRows[0]].className = eRows[this.selectedRows[0]].className.replace(new RegExp('_selected', 'g'),'');
                        this.selectedRows.splice(0, 1);
                      }
                      if (bSelect) {
                        /* Select clicked row */
                        this.selectedRows.push(iRowIndex);
                        eRows[iRowIndex].className = eRows[iRowIndex].className.replace(new RegExp('_selected', 'g'),'');
                        eRows[iRowIndex].className += '_selected';
                      }
                      var a = (eRows[iRowIndex].offsetTop+this._eHead.offsetHeight)+eRows[iRowIndex].offsetHeight+1;
                      var b = (this._eBody.clientHeight+this._eBody.scrollTop);
                      if (a > b) {
                        this._eBody.scrollTop = (a-this._eBody.clientHeight);
                      }
                      var c = eRows[iRowIndex].offsetTop;
                      var d = this._eBody.scrollTop;
                      if (c < d) {
                        this._eBody.scrollTop = c;
                      }
                      /* Call onselect if defined */
                      //    if (this.getProperty("grid/rows/onselect")) {
                      //      alert(this.selectedRows);
                      if (this.rowsOnSelect) {
                        this.rowsOnSelect(this.selectedRows);
                      }
                      //    }
                      return 0;
                    };

                    publ.clearSelection = function() {
                      var eRows = this._eBodyTable.tBodies[0].rows;
                      while (this.selectedRows.length) {
                        // eRows[this.selectedRows[0]].className = (this.selectedRows[0] & 1) ? 'odd' : 'even';
                        eRows[this.selectedRows[0]].className = eRows[this.selectedRows[0]].className.replace(new RegExp('_selected', 'g'),'');
                        this.selectedRows.splice(0, 1);
                      }
                      if (this.onClearSelection) {
                        this.onClearSelection();
                      }
                    }
                    /*
                     * iErrorCode = selectRange(iRowIndex[])
                     * iErrorCode = selectRange(iFromRowIndex, iToRowIndex)
                     * Selects all rows between iFromRowIndex and iToRowIndex.
                     */
                    publ.selectRange = function(a, b) {
                      var aRowIndex;
                      if (typeof a == 'number') {
                        aRowIndex = new Array();
                        for (var i = a; i <= b; i++) {
                          aRowIndex.push(i);
                        }
                        for (var i = b; i <= a; i++) {
                          aRowIndex.push(i);
                        }
                      } else {
                        aRowIndex = a;
                      }
                      for (var i = 0; i < aRowIndex.length; i++) {
                        if ((aRowIndex[i] < 0) || (aRowIndex[i] > this._rows-1)) {
                          this.error = 'Unable to select rows, index out of range.';
                          return 1;
                        }
                      }
                      /* Deselect previously selected rows */
                      var eRows = this._eBodyTable.tBodies[0].rows;
                      while (this.selectedRows.length) {
                        // eRows[this.selectedRows[0]].className = (this.selectedRows[0] & 1) ? 'odd' : 'even';
                        eRows[this.selectedRows[0]].className = eRows[this.selectedRows[0]].className.replace(new RegExp('_selected', 'g'),'');
                        this.selectedRows.splice(0, 1);
                      }

                      /* Select all rows indicated by range */
                      var eRows = this._eBodyTable.tBodies[0].rows;
                      var bMatch;
                      for (var i = 0; i < aRowIndex.length; i++) {
                        bMatch = false;
                        for (var j = 0; j < this.selectedRows.length; j++) {
                          if (this.selectedRows[j] == aRowIndex[i]) {
                            bMatch = true;
                            break;
                          }
                        }
                        if (!bMatch) {
                          /* Select row */
                          this.selectedRows.push(aRowIndex[i]);
                          eRows[aRowIndex[i]].className = eRows[aRowIndex[i]].className.replace(new RegExp('_selected', 'g'),'');
                          eRows[aRowIndex[i]].className += '_selected';
                        }
                      }
                      /* Call onselect if defined */
                      //    if (this.getProperty("grid/rows/onselect")) {
                      if (this.selectedRows.length != 0) {
                        if (this.rowsOnSelect && this._inSortingOperation == false) {
                          this.rowsOnSelect(this.selectedRows);
                        }
                      }
/*                      if (this.rowsOnSelect) {
                        alert("2");
                        this.rowsOnSelect(this.selectedRows);
                      }*/
                      //    }
                      return 0;
                    };

                    /*
                     * void resize(iWidth, iHeight)
                     * Resize the grid to the given dimensions, the outer (border) size is given, not the inner (content) size.
                     */
                    publ.resize = function(w, h) {
                      this._eCont.style.width = w+'px';
                      this._eCont.style.height = h+'px';
                      this.calcSize();
                      /* Call onresize if defined */
                      if (this.onresize) {
                        this.onresize();
                      }
                    };

                    /*
                     * void _colorEvenRows()
                     * Changes the color of even rows (usually to light yellow) to make it easier to read.
                     * Also updates the id column to a sequence counter rather than the row ids.
                     */
/*                    publ._colorEvenRows = function() {
                      if (this._eBodyTable.tBodies.length) {
                        var nodes = this._eBodyTable.tBodies[0].rows;
                        var len = nodes.length;
                        for (var i = 0; i < len; i++) {
                          if (nodes[i].className.indexOf('selected') == -1) {
                            nodes[i].className += ((i & 1) ? ' odd' : ' even');
                          }
                          alert(nodes[i].className);
                        }
                      }
                    };
*/
                    /*
                     * iErrorCode = addRow(aRowData)
                     * Appends supplied row to the column list.
                     */
                    publ.addRow = function(aRowData) {
                      var rc = this._addRow(aRowData);
                      if (rc) {
                        return rc;
                      }
                      this.calcSize();
                      return 0;
                    };

                    /*
                     * iErrorCode = addRows(aData)
                     * Appends supplied rows to the column list.
                     */
                    publ.addRows = function(aData) {
                      for (var i = 0; i < aData.length; i++) {
                        var rc = this._addRow(aData[i]);
                        if (rc) {
                          return rc;
                        }
                      }
                      this.calcSize();
                      return 0;
                    };

                    /*
                     * void _colorEvenRows()
                     * Changes the color of even rows (usually to light yellow) to make it easier to read.
                     * Also updates the id column to a sequence counter rather than the row ids.
                     */
                    publ._colorEvenRows = function() {
                      if (this._eBodyTable.tBodies.length) {
                        var nodes = this._eBodyTable.tBodies[0].rows;
                        var name = ' ';
                        for (var i = 0; i < nodes.length; i++) {
                          if (nodes[i].className.indexOf('selected') == -1) {
                          // if (nodes[i].className != 'selected') {
                          nodes[i].className = (i & 1) ? 'odd' : 'even';
//                        	name = nodes[i].className;
//                        	alert(name);
//                        	name = name.replace('/ odd/g', '');
//                        	name = name.replace('/ even/g','');
//                        	nodes[i].className = name + ((i & 1) ? ' odd' : ' even');
                          }
//                          alert(name);
//                          alert(nodes[i].className);
                        }
                      }
                    };

                    /*
                     * iErrorCode = _addRow(aRowData)
                     */
                    publ._addRow = function(aRowData) {
                      var eBody, eRow, eCell, eCont, i, len;
                      /* Validate column count */
                      if (aRowData.length != this._cols) {
                        return 1;
                      }
                      /* Construct Body Row */
                      eBody = this._eBodyTable.tBodies[0];
                      eRow  = document.createElement('tr');
                      eRow.className += ((this._rows & 1) ? ' odd' : ' even');
                      for (i = 0; i < this._cols; i++) {
                        eCell = document.createElement('td');
                        eCont = document.createElement('div');
                        eCont.appendChild(document.createTextNode(aRowData[i]));
                        eCell.appendChild(eCont);
                        eRow.appendChild(eCell);
                      }
                      eBody.appendChild(eRow);
                      /* Update row counter */
                      this._rows++;
                      if (this._eBodyCols == null) {
                        this._eBodyCols = this._eBodyTable.tBodies[0].rows[0].cells;
                      }
                      return 0;
                    };

                    /*
                     * iErrorCode = removeRow(iRowIndex)
                     * Appends supplied row to the grid.
                     */
                    publ.removeRow = function(iRowIndex) {
                      /* Remove row */
                      var rc = this._removeRow(iRowIndex);
                      if (rc) {
                        return rc;
                      }
                      /* Update row counter and select previous row, if any */
                      this._rows--;
                      this.selectRow((iRowIndex > 1) ? iRowIndex-1 : 0);
                      /* Recolor rows, if needed */
                      if (this.rowsColorEven) {
                        this._colorEvenRows();
                      }
                      this.calcSize();
                      /* Call onselect if defined */
                      //    if (this.getProperty("grid/rows/onselect")) {
                      if (this.selectedRows.length != 0) {
                        if (this.rowsOnSelect) {
                          this.rowsOnSelect(this.selectedRows);
                        }
                      }
                      //    }
                      return 0;
                    };

                    /*
                     * iErrorCode = removeRange(iRowIndex[])
                     * iErrorCode = removeRange(iFirstRowIndex, iLastRowIndex)
                     * Appends supplied row to the grid.
                     */
                    publ.removeRange = function(a, b) {
                      var aRowIndex = new Array();
                      if (typeof a == 'number') {
                        for (var i = a; i <= b; i++) { aRowIndex.push(i); }
                      } else {
                        for (var i = 0; i < a.length; i++) {
                          aRowIndex.push(a[i]);
                        }
                        aRowIndex.sort(compareNumericDesc);
                      }
                      for (var i = aRowIndex.length-1; i >= 0; i--) {
                        /* Remove row */
                        var rc = this._removeRow(aRowIndex[i]);
                        if (rc) {
                          return rc;
                        }
                        /* Update row counter and select previous row, if any */
                        this._rows--;
                      }
                      /* Recolor rows, if needed */
                      if (this.rowsColorEven) {
                        this._colorEvenRows();
                      }
                      this.calcSize();
                      /* Call onselect if defined */
                      //    if (this.getProperty("grid/rows/onselect")) {
                      if (this.selectedRows.length != 0) {
                        if (this.rowsOnSelect) {
                          this.rowsOnSelect(this.selectedRows);
                        }
                      }
                      //    }
                      return 0;
                    };

                    /*
                     * iErrorCode = _removeRow(iRowIndex)
                     */
                    publ._removeRow = function(iRowIndex) {
                      if ((iRowIndex < 0) || (iRowIndex > this._rows-1)) {
                        this.error = 'Unable to remove row, row index out of range.';
                        return 1;
                      }
                      /* Remove from selected */
                      for (var i = this.selectedRows.length - 1; i >= 0; i--) {
                        if (this.selectedRows[i] == iRowIndex) {
                          this.selectedRows.splice(i, 1);
                        }
                      }
                      this._eBodyTable.tBodies[0].removeChild(this._eBodyTable.tBodies[0].rows[iRowIndex]);
                      return 0;
                    };

                    /*
                     * iRowIndex getSelectedRow()
                     * Returns the index of the selected row or -1 if no row is selected.
                     */
                    publ.getSelectedRow = function() {
                      return (this.selectedRows.length) ? this.selectedRows[this.selectedRows.length-1] : -1;
                    };

                    /*
                     * iRowIndex[] getSelectedRange()
                     * Returns an array with the row index of all selecteds row or null if no row is selected.
                     */
                    publ.getSelectedRange = function() {
                      return (this.selectedRows.length) ? this.selectedRows : -1;
                    };

                    /*
                     * iRows getRowCount()
                     * Returns the nummer of rows.
                     */
                    publ.getRowCount = function() {
                      return this._rows;
                    };

                    /*
                     * iRows getColumnCount()
                     * Returns the nummer of columns.
                     */
                    publ.getColumnCount = function() {
                      return this._cols;
                    };

                    /*
                     * sValue = getCellValue(iRowIndex, iColumnIndex)
                     * Returns the content of the specified cell.
                     */
                    publ.getCellValue = function(iRowIndex, iColIndex) {
                      if ((iRowIndex < 0) || (iRowIndex > this._rows-1)) {
                        this.error = 'Unable to get cell value , row index out of range.';
                        return null;
                      }
                      if ((iColIndex < 0) || (iColIndex > this._cols-1)) {
                        this.error = 'Unable to get cell value , row index out of range.';
                        return null;
                      }
                      return this._eBodyTable.tBodies[0].rows[iRowIndex].cells[iColIndex].innerHTML;
                    };

                    /*
                     * sValue = getCellValue(iRowIndex, iColumnIndex)
                     * Returns the content of the specified cell.
                     */
                    publ.getRowid = function(iRowIndex) {
                      if ((iRowIndex < 0) || (iRowIndex > this._rows-1)) {
                        this.error = 'Unable to get rowid , row index out of range.';
                        return null;
                      }
                      return this._eBodyTable.tBodies[0].rows[iRowIndex].id;
                    };

                    /*
                     * iError = setCellValue(iRowIndex, iColumnIndex, sValue)
                     * Sets the content of the specified cell.
                     */
                    publ.setCellValue = function(iRowIndex, iColIndex, sValue) {
                      if ((iRowIndex < 0) || (iRowIndex > this._rows-1)) {
                        this.error = 'Unable to get cell value , row index out of range.';
                        return 1;
                      }
                      if ((iColIndex < 0) || (iColIndex > this._cols-1)) {
                        this.error = 'Unable to get cell value , row index out of range.';
                        return 2;
                      }
                      this._eBodyTable.tBodies[0].rows[iRowIndex].cells[iColIndex].innerHTML = sValue;
                      this.calcSize();
                      return 0;
                    };

                    /*
                     * void setSortTypes(sSortType[]) {
                     * Sets the column data types, used for sorting.
                     * Valid options: Number, String, CaseInsensitiveString
                     */
                    publ.setSortTypes = function(aSortTypes) {
                      this._stl.setSortTypes(aSortTypes);
                    }

                    /*
                     * void sort(iColumnIndex, [bDescending])
                     * Sorts the grid by the specified column (zero based index) and, optionally, in the specified direction.
                     */
                    publ.sort = function(iCol, bDesc) {
                      /* Hide arrow from header for column currently sorted by */
                      if (this.sortCol != -1) {
                        var eImg = this._eHeadTable.tBodies[0].rows[0].cells[this.sortCol].getElementsByTagName('img')[0];
                        eImg.style.display = 'none';
                      }
                      /* Determine sort direction */
                      if (bDesc == null) {
                        bDesc = false;
                        if ((!this.sortDescending) && (iCol == this.sortCol)) {
                          bDesc = true;
                        }
                      }
                      /* Indicate sorting using arrow in header */
                      var eImg = this._eHeadTable.tBodies[0].rows[0].cells[iCol].getElementsByTagName('img')[0];
                      eImg.src = (bDesc)?IMG_DESC:IMG_ASC;
                      eImg.style.display = 'inline';
                      /* Perform sort operation */
                      this._stl.sort(iCol, bDesc);
                      this.sortCol = iCol;
                      this.sortDescending = bDesc;
                      /* Update row coloring */
                      //alert(this.rowsColorEven);
                      if (this.rowsColorEven) {
                        this._colorEvenRows();
                      }
                      this._inSortingOperation = true;
                      /* Update selection */
                      var nodes = this._eBodyTable.tBodies[0].rows;
                      var len = nodes.length;
                      var a = new Array();
                      for (var i = 0; i < len; i++) {
                        // if (nodes[i].className == 'selected') {
                        if (nodes[i].className.indexOf('selected') != -1) {
                          a.push(i);
                        }
                      }
                      this.selectRange(a);
                      this._inSortingOperation = false;
                      /*
                       * As the header cell may have grown to accommodate the sorting indicator
                       * we set the width of the body columns
                       */
                      this._sizeBodyAccordingToHeader();
                      /* Call onsort if defined */
                      if (this.onsort) {
                        this.onsort(this.sortCol, this.sortDescending);
                      }
                    };

                    /*
                     * void _handleRowKey(iKeyCode)
                     * Key handler for events on row level.
                     */
                    publ._handleRowKey = function(iKeyCode, bCtrl, bShift) {
                      var iActiveRow = -1;
                      if (this.selectedRows.length != 0) {
                        iActiveRow = this.selectedRows[this.selectedRows.length-1];
                      }
                      if ((!bCtrl) && (!bShift)) {
                        if (iKeyCode == 38) {                                                      // Up
                          if (iActiveRow > 0) {
                            this.selectRow(iActiveRow-1);
                          }
                        } else if (iKeyCode == 40) {                                                 // Down
                          if (iActiveRow < this._rows-1) {
                            this.selectRow(iActiveRow + 1);
                          }
                        }
                        if (iKeyCode == 33) {                                                      // Page Up
                          if (iActiveRow > 10) {
                            this.selectRow(iActiveRow-10);
                          } else { this.selectRow(0); }
                        } else if (iKeyCode == 34) {                                                 // Page Down
                          if (iActiveRow < this._rows-10) {
                            this.selectRow(iActiveRow+10);
                          } else {
                            this.selectRow(this._rows - 1);
                          }
                        } else if (iKeyCode == 36) { // Home
                          this.selectRow(0);
                        } else if (iKeyCode == 35) { // End
                          this.selectRow(this._rows-1);
                        } else {
                          return true;
                        }
                        return false;
                      }
                    };

                    /*
                     * Event Handlers
                     */

                    publ._mouseMove = function(e) {
                      var el = (e) ? e.target : window.event.srcElement;
                      var x = (e) ? e.pageX : window.event.x+this._eBody.scrollLeft;
                      if ((this._activeHeaders) && (this._activeHeaders[0])) {
                        /*
                         * User is resizing a column, determine and set new size
                         * based on the original size and the difference between
                         * the current mouse position and the one that was recorded
                         * once the resize operation was started.
                         */
                        var w = this._activeHeaders[2]+x-this._activeHeaders[3];
                        var tw = ((w-this._activeHeaders[2])+this._activeHeaders[4])+1;
                        this._eHeadTable.style.width = tw+'px';
                        // document.title = ((w-this._activeHeaders[2])+this._activeHeaders[4])+1+' '+this._eHeadTable.offsetWidth;
                        if (w > 5) {
                          this._activeHeaders[1].style.width = w+'px';
                          if (this.columnsResizeBody) {
                            this._eBodyTable.style.width = tw+'px';
                            this._eBodyTable.getElementsByTagName('colgroup')[0].getElementsByTagName('col')[this._activeHeaders[1].cellIndex].style.width = w+'px';
                          }
                        }
                      } else if ((el.tagName == 'TD') && (el.parentNode.parentNode.parentNode.parentNode.className == 'tablegrid-head')) {
                        /*
                         * The cursor is on top of a header cell, check if it's near the edge,
                         * and in that case set the mouse cursor to 'e-resize'.
                         */
                        this._checkHeaderResize(el, x);
                      } else if (this._activeHeaders) {
                        this._activeHeaders = null;
                        this._eCont.style.cursor = 'default';
                      }
                    };


                    publ._mouseDown = function(e) {
                      var el = (e) ? e.target : window.event.srcElement;
                      var x = (e) ? e.pageX : window.event.x + this._eBody.scrollLeft;
                      this._checkHeaderResize(el, x);
                      if ((this._activeHeaders) && (el.tagName == 'TD') && (el.parentNode.parentNode.parentNode.parentNode.className == 'tablegrid-head')) {
                        /*
                         * Cursor is near the edge of a header cell and the
                         * left mouse button is down, start resize operation.
                         */
                        this._activeHeaders[0] = true;
                        if (this.columnsResizeBody) {
                          this._sizeBodyAccordingToHeader();
                        }
                      }
                    };

                    publ._mouseUp = function(e) {
                      var el = (e) ? e.target:window.event.srcElement;
                      var x = (e) ? e.pageX:window.event.x+this._eBody.scrollLeft;
                      if (this._activeHeaders) {
                        if (this._activeHeaders[0]) {
                          this._sizeBodyAccordingToHeader();
                          this._checkHeaderResize(el, x);
                        }
                        this._activeHeaders = null;
                      } else if ((el.tagName == 'TD') && (el.parentNode.parentNode.parentNode.parentNode.className == 'tablegrid-head')) {
                        this.sort(el.cellIndex);
                      }
                    };

                    publ._click = function(e) {
                      var el = (e)?e.target:window.event.srcElement;
                      if (el.tagName == 'IMG') {
                        el = el.parentNode;
                      }
                      if (el.tagName == 'DIV') {
                        el = el.parentNode;
                      }
                      if ((el.tagName == 'TD') && (el.parentNode.parentNode.parentNode.parentNode.className == 'tablegrid-body')) {
                        var eRows = this._eBodyTable.tBodies[0].rows;
                        if (eRows[el.parentNode.rowIndex].id != '______FIGARO______') {
                          this.selectRow(el.parentNode.rowIndex, (e)?e.ctrlKey:window.event.ctrlKey);
                          if (this.onRowClick) {
                            this.onRowClick(el.parentNode.rowIndex, this);
                          }
                        }
                      }
                      //this._eCont.focus();
                    };

                    publ._keyDown = function(e) {
                      var el = (e) ? e.target:window.event.srcElement;
                      var key = (e) ? e.keyCode:window.event.keyCode;
                      if (el.tagName == 'DIV') {
                        el = el.parentNode;
                      }
                      if (el.className.indexOf('gridBox') == 0) {
                        if (handleEditKey(el, key)) {
                          return true;
                        }
                        if (window.event) {
                          window.event.cancelBubble = true;
                        } else {
                          e.preventDefault();
                          e.stopPropagation()
                        }
                        return false;
                      } else if ((el.tagName == 'TD') && (el.parentNode.parentNode.parentNode.parentNode.className == 'gridIdCol')) {
                        if (handleRowKey(key)) {
                          return;
                        }
                        if (window.event) {
                          window.event.cancelBubble = true;
                        } else {
                          e.preventDefault();
                          e.stopPropagation()
                        }
                        return false;
                      }
                    };

                    /*
                     * Event handler helpers
                     */

                    publ._checkHeaderResize = function(el, x) {
                      /*
                       * Checks if the mouse cursor is near the edge of a header
                       * cell, in that case the cursor is set to 'e-resize' and
                       * the _activeHeaders collection is created containing a
                       * references to the active header cell, the current mouse
                       * position and the cells original width.
                       */
                      if ((el.tagName != 'TD') || (el.parentNode.parentNode.parentNode.parentNode.className != 'tablegrid-head')) {
                        return;
                      }
                      if (el.tagName == 'IMG') {
                        el = el.parentNode;
                      }
                      var prev = el.previousSibling;
                      var next = el.nextSibling;
                      var left = getLeftPos(el);
                      var right = left+el.offsetWidth;
                      var l = (x-10)-left;
                      var r = right-x;
                      if ((l < 10) && (prev)) {
                        this._eCont.style.cursor = 'e-resize';
                        this._activeHeaders = [false, prev, prev.offsetWidth-10, x, this._eHeadTable.offsetWidth];
                        // document.title = prev;
                      } else if (r < 10) {
                        this._eCont.style.cursor = 'e-resize';
                        this._activeHeaders = [false, el, el.offsetWidth-10, x, this._eHeadTable.offsetWidth];
                      } else if (this._activeHeaders) {
                        this._activeHeaders = null;
                        this._eCont.style.cursor = 'default';
                        el.style.backgroundColor = '';
                      }
                    }

                    publ._sizeBodyAccordingToHeader = function() {
                      /*
                       * The overflow porperty on table columns is only effective if the
                       * table type is set to fixed thus this function changes the table
                       * type to fixed and sets the width of each body column to size of
                       * the corresponding header column.
                       */
                      this._eBodyTable.style.width = this._eHeadTable.offsetWidth+'px';
                      this._eBodyTable.style.tableLayout = 'fixed';
                      var length = this._eBodyCols.length;
                      var aCols = this._eBodyTable.getElementsByTagName('colgroup')[0].getElementsByTagName('col');
                      for (var i = 0; i < length; i++) {
                        aCols[i].style.width = (this._eHeadCols[i].offsetWidth-((document.all)?2:0))+'px';
                      }
                    }

                    /*
                     * Helper functions
                     */

                    function getInnerText(el) {
                      if (document.all) {
                        return el.innerText;
                      }
                      var str = '';
                      var cs = el.childNodes;
                      var l = cs.length;
                      for (var i = 0; i < l; i++) {
                        switch (cs[i].nodeType) {
                          case 1: //ELEMENT_NODE
                            str += getInnerText(cs[i]);
                            break;
                          case 3: //TEXT_NODE
                            str += cs[i].nodeValue;
                            break;
                        }
                      }
                      return str;
                    }

                    function getLeftPos(_el) {
                      var x = 0;
                      for (var el = _el; el; el = el.offsetParent) {
                        x += el.offsetLeft;
                      }
                      return x;
                    }

                    function compareByColumn(iCol, bDescending, iType) {
                      var fTypeCast;
                      switch (iType) {
                        case TYPE_NUMERIC:
                          fTypeCast = Number;
                          break;
                        case TYPE_STRING:
                          fTypeCast = String;
                          break;
                        default:
                          fTypeCast = String
                      }

                      return function (n1, n2) {
                        if (fTypeCast(getInnerText(n1.cells[iCol])) < fTypeCast(getInnerText(n2.cells[iCol]))) {
                          return (bDescending) ? -1 : 1;
                        }
                        if (fTypeCast(getInnerText(n1.cells[iCol])) > fTypeCast(getInnerText(n2.cells[iCol]))) {
                          return (bDescending) ? 1 : -1;
                        }
                        return 0;
                      };
                    }

                    function compareNumericDesc(n1, n2) {
                      if (Number(n1) < Number(n2)) {
                        return 1;
                      }
                      if (Number(n1) > Number(n2)) {
                        return -1;
                      }
                      return 0;
                    }

                    publ.generate = function(targetElm, akcio) {
                      var most = new Date();
                      var xslObj = new JSCL.Net.Xsl;
                      xslObj.loadXsl(xslObj.SOURCETYPE.TEXT, this.generateXSL());
                      xslObj.setData(xslObj.SOURCETYPE.NODE, this.datasource.getDS());
                      xslObj.retrieveData();
                      // kiment(xslObj.xsl);
                      // kiment(xslObj.xml);
                      logger.debug("var transformed = xslObj.transform();");
                      logger.debug("xslObj = " + typeof(xslObj));
                      var transformed = xslObj.transform();
                      logger.debug(transformed);
                      if (typeof (targetElm) == 'string') {
                        this._container = targetElm;
                        var tElm = document.getElementById(this._container);
                         clearNodeList(tElm);
                        tElm.innerHTML = transformed;
                      } else {
                        this._container = targetElm.id;
                         clearNodeList(targetElm);
                        var tElm = targetElm;
                      }
                      logger.debug("publ.generate in progress..");
                      tElm.innerHTML = transformed;
                      logger.debug("bind:: getting element: " + this.id+'container');
                      var temp = document.getElementById(this.id+'container');
                      logger.debug("result: " + typeof(temp));
                      var rc = this.bind(document.getElementById(this.id+'container'), document.getElementById(this.id+'head'), document.getElementById(this.id+'body'));
                      if (rc) {
                        alert(this.error);
                      }
                      var vegen = new Date();
                      if (isUndef(akcio) == false) {
                        logger.debug(akcio+'- Idõ: '+(vegen-most));
                      } else {
                        logger.debug('Letöltés - Idõ: '+(vegen-most));
                      }
                    }

                    publ.generateXSL = function() {
                      var i;
                      var xslSrc =
                        '<?xml version="1.0" encoding="UTF-8"?><!-- MOD -->'+
                        '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">'+
                        '  <xsl:output method="html" encoding="iso-8859-2" indent="no"/>'+
                        '  <xsl:decimal-format name="currencyC" NaN=" " decimal-separator="," grouping-separator=" "/>'+
                        '  <xsl:decimal-format name="currencyD" NaN=" " decimal-separator="." grouping-separator=","/>'+
                        '  <xsl:template match="'+this.datasource.table+'">'+
                        '    <div id="'+this.id+'container" class="tablegrid" style="width: '+this.width+'; height: '+this.height+'">'+
                        '      <div id="'+this.id+'head" class="tablegrid-head">'+
                        '        <table cellspacing="0" cellpadding="0">';
                      xslSrc = xslSrc+'          <colgroup span="'+this.columnsCount+'">';
                      for (i = 0; i < this.columnsCount; i++) {
                        var szeles = this.columnsWidth(i);
                        if (szeles != null) {
                          xslSrc = xslSrc+'            <col width="'+szeles+'" />';
                        }
                      }
                      xslSrc = xslSrc+'          </colgroup>'+
                        '          <tr>';
                      for (i = 0; i < this.columnsCount; i++) {
                        var fej = this.columnsHead(i);
                        var tipus = this.columnsType(i);
                        if(tipus != "Hidden") {
                        	xslSrc = xslSrc+'            <td>'+fej+'<img src="lib/images/asc.png"/></td>';
                        } else {
                        	xslSrc = xslSrc+'            <td></td>';
                        }
                      }
                      xslSrc = xslSrc+'          </tr>'+
                        '        </table>'+
                        '      </div>'+
                        '      <div id="'+this.id+'body" class="tablegrid-body">'+
                        '        <table cellspacing="0" cellpadding="0">';
                      xslSrc = xslSrc+'          <colgroup span="'+this.columnsCount+'">';
                      for (i = 0; i < this.columnsCount; i++) {
                        var szeles = this.columnsWidth(i);
                        if (szeles == null) {
                          xslSrc = xslSrc+'            <col style="width: auto;" />';
                        } else {
                          xslSrc = xslSrc+'            <col style="width: '+szeles+';" />';
                        }
                      }
                      xslSrc = xslSrc+'          </colgroup>'+
                        '          <xsl:choose>'+
                        '          <xsl:when test="count(//'+this.datasource.name+') != 0">'+
                        '          <xsl:apply-templates select="//'+this.datasource.name+'">';
                      var order = this.datasource.sortDirection;
                      if (order != "U") {
                        xslSrc = xslSrc+'            <xsl:sort select="'+this.datasource.sortField+'" order="'+((order == "A") ? "ascending" : "descending")+'"/>';
                      }
                      xslSrc = xslSrc+'          </xsl:apply-templates>'+
                        '        </xsl:when>'+
                        '        <xsl:otherwise>'+
                        '          <tr id="_______FIGARO______">'
                        for (i = 0; i < this.columnsCount; i++) {
                          xslSrc = xslSrc+'    <td></td>';
                        }
                      xslSrc = xslSrc+'          </tr>'+
                        '        </xsl:otherwise>'+
                        '        </xsl:choose>'+
                        '        </table>'+
                        '      </div>'+
                        '    </div>'+
                        '  </xsl:template>'+
                        '  <xsl:template match="'+this.datasource.name+'">'+
                        '   <tr>'+
                        '    <xsl:attribute name="id">';
                      if (msie) {
                        if (getIEDocumentDiff() == 0) {
                          xslSrc = xslSrc+"     <xsl:value-of select=\"concat(name(.), '[', position(), ']')\"/>"+
                            '    </xsl:attribute>';
                        } else {
                          xslSrc = xslSrc+"     <xsl:value-of select=\"concat(name(.), '[', position()-1, ']')\"/>"+
                            '    </xsl:attribute>';
                        }
                      } else {
                        xslSrc = xslSrc+"     <xsl:value-of select=\"concat(name(.), '[', position(), ']')\"/>"+
                          '    </xsl:attribute>';
                      }
                      var feltetel = this.rowClassification();
                      if (feltetel.XPath.length != 0) {
                        xslSrc = xslSrc+"     <xsl:choose>";
                        xslSrc = xslSrc+" 			<xsl:when test=\""+feltetel.XPath+"\">";
                        xslSrc = xslSrc+" 				<xsl:attribute name=\"class\">"+feltetel.Classification+"</xsl:attribute>";
                        xslSrc = xslSrc+" 			</xsl:when>";
                        xslSrc = xslSrc+"     </xsl:choose>";
                      }
                      for (i = 0; i < this.columnsCount; i++) {
                        var adat = this.columnsData(i);
                        var tipus = this.columnsType(i);
                        if (adat) {
                          if (tipus == "String") {
                            xslSrc = xslSrc+'    <td><xsl:value-of select="'+adat+'"/></td>';
                          } else {
                        	if(tipus == "Hidden") {
                        		xslSrc = xslSrc+'    <td></td>';
                        	} else {
	                            xslSrc = xslSrc + '    <td align="right">';
	                            xslSrc = xslSrc + '<xsl:choose>';
	                            xslSrc = xslSrc + '<xsl:when test="string(number('+adat+'))=\'NaN\'">';
	                            xslSrc = xslSrc+' ';
	                            xslSrc = xslSrc + '</xsl:when>';
	                            xslSrc = xslSrc + '         <xsl:otherwise>';
	                            if (tipus.match("^CurrencyC") == "CurrencyC") {
	                              var minta = tipus.substr(10);
	                              xslSrc = xslSrc + '<xsl:value-of select="format-number(' + adat + ', &quot;'+minta+'&quot;, &quot;currencyC&quot;)"/>';
	                            } else {
	                              if (tipus.match("^CurrencyD") == "CurrencyD") {
	                                var minta = tipus.substr(10);
	                                xslSrc = xslSrc + '<xsl:value-of select="format-number(' + adat + ', &quot;'+minta+'&quot;, &quot;currencyD&quot;)"/>';
	                              } else {
	                                if (tipus.match("^NumberC") == "NumberC") {
	                                  xslSrc = xslSrc + '<xsl:value-of select="format-number(' + adat + ', &quot;###############,############&quot;, &quot;currencyC&quot;)"/>';
	                                } else {
	                                  if (tipus.match("^NumberD") == "NumberD") {
	                                    xslSrc = xslSrc + '<xsl:value-of select="format-number(' + adat + ', &quot;###############.############&quot;, &quot;currencyD&quot;)"/>';
	                                  } else {
	                                    xslSrc = xslSrc + '<xsl:value-of select="' + adat + '"/>';
	                                  }
	                                }
	                              }
	                            }
	                            xslSrc = xslSrc + '         </xsl:otherwise>';
	                            xslSrc = xslSrc + ' </xsl:choose>';
	                            xslSrc = xslSrc + '</td>';
                            }
                          }
                        } else {
                          xslSrc = xslSrc+'    <td>???</td>';
                        }
                      }
                      xslSrc = xslSrc+'   </tr>'+
                        '  </xsl:template>'+
                        '</xsl:stylesheet>';
                      logger.debug(xslSrc);
                      return (xslSrc);
                    }
                  }
                 )
  ;
;
JSCL.UI.SortableTable =
  JSCL.Lang.Class("JSCL.UI.SortableTable",
                  function(publ) {
                    publ.init = function(oTable, oSortTypes) {
                      this._sortTypes = oSortTypes || [];

                      this.sortColumn = null;
                      this.descending = null;

                      var oThis = this;
                      this._headerOnclick = function (e) {
                        oThis.headerOnclick(e);
                      };

                      if (oTable) {
                        this.setTable( oTable );
                        this.document = oTable.ownerDocument || oTable.document;
                      }
                      else {
                        this.document = document;
                      }


                      // only IE needs this
                      var win = this.document.defaultView || this.document.parentWindow;
                      this._onunload = function () {
                        oThis.destroy();
                      };
                      if (win && typeof win.attachEvent != "undefined") {
                        win.attachEvent("onunload", this._onunload);
                      }
                    }
                    // Mozilla is faster when doing the DOM manipulations on
                    // an orphaned element. MSIE is not
                    removeBeforeSort = gecko;

                    publ.onsort = function () {};

                    // default sort order. true -> descending, false -> ascending
                    publ.defaultDescending = false;

                    // shared between all instances. This is intentional to allow external files
                    // to modify the prototype
                    publ._sortTypeInfo = {};

                    publ.setTable = function (oTable) {
                      if ( this.tHead )
                        this.uninitHeader();
                      this.element = oTable;
                      this.setTHead( oTable.tHead );
                      this.setTBody( oTable.tBodies[0] );
                    };

                    publ.setTHead = function (oTHead) {
                      if (this.tHead && this.tHead != oTHead )
                        this.uninitHeader();
                      this.tHead = oTHead;
                      this.initHeader( this._sortTypes );
                    };

                    publ.setTBody = function (oTBody) {
                      this.tBody = oTBody;
                    };

                    publ.setSortTypes = function ( oSortTypes ) {
                      if ( this.tHead )
                        this.uninitHeader();
                      this._sortTypes = oSortTypes || [];
                      if ( this.tHead )
                        this.initHeader( this._sortTypes );
                    };

                    // adds arrow containers and events
                    // also binds sort type to the header cells so that reordering columns does
                    // not break the sort types
                    publ.initHeader = function (oSortTypes) {
                      if (!this.tHead) return;
                      var cells = this.tHead.rows[0].cells;
                      var doc = this.tHead.ownerDocument || this.tHead.document;
                      this._sortTypes = oSortTypes || [];
                      var l = cells.length;
                      var img, c;
                      for (var i = 0; i < l; i++) {
                        c = cells[i];
                        if (this._sortTypes[i] != null && this._sortTypes[i] != "None") {
                          img = doc.createElement("IMG");
                          img.src = "lib/images/blank.png";
                          c.appendChild(img);
                          if (this._sortTypes[i] != null)
                            c._sortType = this._sortTypes[i];
                          if (typeof c.addEventListener != "undefined")
                            c.addEventListener("click", this._headerOnclick, false);
                          else if (typeof c.attachEvent != "undefined")
                            c.attachEvent("onclick", this._headerOnclick);
                          else
                            c.onclick = this._headerOnclick;
                        }
                        else
                        {
                          c.setAttribute( "_sortType", oSortTypes[i] );
                          c._sortType = "None";
                        }
                      }
                      this.updateHeaderArrows();
                    };

                    // remove arrows and events
                    publ.uninitHeader = function () {
                      if (!this.tHead) return;
                      var cells = this.tHead.rows[0].cells;
                      var l = cells.length;
                      var c;
                      for (var i = 0; i < l; i++) {
                        c = cells[i];
                        if (c._sortType != null && c._sortType != "None") {
                          c.removeChild(c.lastChild);
                          if (typeof c.removeEventListener != "undefined")
                            c.removeEventListener("click", this._headerOnclick, false);
                          else if (typeof c.detachEvent != "undefined")
                            c.detachEvent("onclick", this._headerOnclick);
                          c._sortType = null;
                          c.removeAttribute( "_sortType" );
                        }
                      }
                    };

                    publ.updateHeaderArrows = function () {
                      if (!this.tHead) return;
                      var cells = this.tHead.rows[0].cells;
                      var l = cells.length;
                      var img;
                      for (var i = 0; i < l; i++) {
                        if (cells[i]._sortType != null && cells[i]._sortType != "None") {
                          img = cells[i].lastChild;
                          if (i == this.sortColumn)
                            img.className = "sort-arrow " + (this.descending ? "descending" : "ascending");
                          else
                            img.className = "sort-arrow";
                        }
                      }
                    };

                    publ.headerOnclick = function (e) {
                      // find TD element
                      var el = e.target || e.srcElement;
                      while (el.tagName != "TD")
                        el = el.parentNode;

                      this.sort(msie ? getCellIndex(el) : el.cellIndex);
                    };

                    // IE returns wrong cellIndex when columns are hidden
                    getCellIndex = function (oTd) {
                      var cells = oTd.parentNode.childNodes
                        var l = cells.length;
                      var i;
                      for (i = 0; cells[i] != oTd && i < l; i++)
                        ;
                      return i;
                    };

                    publ.getSortType = function (nColumn) {
                      return this._sortTypes[nColumn] || "String";
                    };

                    // only nColumn is required
                    // if bDescending is left out the old value is taken into account
                    // if sSortType is left out the sort type is found from the sortTypes array

                    publ.sort = function (nColumn, bDescending, sSortType) {
                    	StartWorking();
                      if (!this.tBody) return;
                      if (sSortType == null)
                        sSortType = this.getSortType(nColumn);

                      // exit if None
                      if (sSortType == "None")
                        return;

                      if (bDescending == null) {
                        if (this.sortColumn != nColumn)
                          this.descending = this.defaultDescending;
                        else
                          this.descending = !this.descending;
                      }
                      else
                        this.descending = bDescending;

                      this.sortColumn = nColumn;

                      if (typeof this.onbeforesort == "function")
                        this.onbeforesort();

                      var f = this.getSortFunction(sSortType, nColumn);
                      var a = this.getCache(sSortType, nColumn);
                      var tBody = this.tBody;

                      a.sort(f);

                      if (this.descending)
                        a.reverse();

                      if (removeBeforeSort) {
                        // remove from doc
                        var nextSibling = tBody.nextSibling;
                        var p = tBody.parentNode;
                        p.removeChild(tBody);
                      }

                      // insert in the new order
                      var l = a.length;
                      for (var i = 0; i < l; i++)
                        tBody.appendChild(a[i].element);

                      if (removeBeforeSort) {
                        // insert into doc
                        p.insertBefore(tBody, nextSibling);
                      }

                      this.updateHeaderArrows();

                      this.destroyCache(a);

                      if (typeof this.onsort == "function")
                        this.onsort();
                    	StopWorking();
                    };

                    publ.asyncSort = function (nColumn, bDescending, sSortType) {
                      var oThis = this;
                      this._asyncsort = function () {
                        oThis.sort(nColumn, bDescending, sSortType);
                      };
                      window.setTimeout(this._asyncsort, 1);
                    };

                    publ.getCache = function (sType, nColumn) {
                      if (!this.tBody) return [];
                      var rows = this.tBody.rows;
                      var l = rows.length;
                      var a = new Array(l);
                      var r;
                      for (var i = 0; i < l; i++) {
                        r = rows[i];
                        a[i] = {
                        value:    this.getRowValue(r, sType, nColumn),
                          element:  r
                        };
                      };
                      return a;
                    };

                    publ.destroyCache = function (oArray) {
                      var l = oArray.length;
                      for (var i = 0; i < l; i++) {
                        oArray[i].value = null;
                        oArray[i].element = null;
                        oArray[i] = null;
                      }
                    };

                    publ.getRowValue = function (oRow, sType, nColumn) {
                      // if we have defined a custom getRowValue use that
                      if (this._sortTypeInfo[sType] && this._sortTypeInfo[sType].getRowValue)
                        return this._sortTypeInfo[sType].getRowValue(oRow, nColumn);

                      var s;
                      var c = oRow.cells[nColumn];
                      if (typeof c.innerText != "undefined")
                        s = c.innerText;
                      else
                        s = getInnerText(c);
                      return this.getValueFromString(s, sType);
                    };

                    getInnerText = function (oNode) {
                      var s = "";
                      var cs = oNode.childNodes;
                      var l = cs.length;
                      for (var i = 0; i < l; i++) {
                        switch (cs[i].nodeType) {
                          case 1: //ELEMENT_NODE
                            s += getInnerText(cs[i]);
                            break;
                          case 3: //TEXT_NODE
                            s += cs[i].nodeValue;
                            break;
                        }
                      }
                      return s;
                    };

                    publ.getValueFromString = function (sText, sType) {
                       var  typ = sType;

                       switch (typ) {
                       case 'Number':
//	                       return Number(sText);
//                       		alert(parseFloat(sText));
                       		return parseFloat(sText);
                       case 'CaseInsensitiveString':
    	                   return sText.toUpperCase();
                       }
                      if (this._sortTypeInfo[sType])
                      {
                        return this._sortTypeInfo[sType].getValueFromString( sText );
                      }
                       return sText;
                    };

                    publ.getSortFunction = function (sType, nColumn) {
                      if (this._sortTypeInfo[sType])
                        return this._sortTypeInfo[sType].compare;
                      return basicCompare;
                    };

                    publ.destroy = function () {
                      this.uninitHeader();
                      var win = this.document.parentWindow;
                      if (win && typeof win.detachEvent != "undefined") { // only IE needs this
                        win.detachEvent("onunload", this._onunload);
                      }
                      this._onunload = null;
                      this.element = null;
                      this.tHead = null;
                      this.tBody = null;
                      this.document = null;
                      this._headerOnclick = null;
                      this.sortTypes = null;
                      this._asyncsort = null;
                      this.onsort = null;
                    };

                    // Adds a sort type to all instance of SortableTable
                    // sType : String - the identifier of the sort type
                    // fGetValueFromString : function ( s : string ) : T - A function that takes a
                    //    string and casts it to a desired format. If left out the string is just
                    //    returned
                    // fCompareFunction : function ( n1 : T, n2 : T ) : Number - A normal JS sort
                    //    compare function. Takes two values and compares them. If left out less than,
                    //    <, compare is used
                    // fGetRowValue : function( oRow : HTMLTRElement, nColumn : int ) : T - A function
                    //    that takes the row and the column index and returns the value used to compare.
                    //    If left out then the innerText is first taken for the cell and then the
                    //    fGetValueFromString is used to convert that string the desired value and type

                    publ.addSortType = function (sType, fGetValueFromString, fCompareFunction, fGetRowValue) {
                      this._sortTypeInfo[sType] = {
                      type:       sType,
                        getValueFromString: fGetValueFromString || idFunction,
                        compare:      fCompareFunction || basicCompare,
                        getRowValue:    fGetRowValue
                      };
                    };

                    // this removes the sort type from all instances of SortableTable
                    publ.removeSortType = function (sType) {
                      delete this._sortTypeInfo[sType];
                    };

                    basicCompare = function compare(n1, n2) {
                      if (n1.value < n2.value)
                        return -1;
                      if (n2.value < n1.value)
                        return 1;
                      return 0;
                    };

                    idFunction = function (x) {
                      return x;
                    };

                    toUpperCase = function (s) {
                      return s.toUpperCase();
                    };

                    // add sort types
                    publ.addSortType("Number", Number);
                    publ.addSortType("CaseInsensitiveString", toUpperCase);
                    publ.addSortType("String");
                    // None is a special case
                  }
                 )
  ;
;
JSCL.UI.Textbox =
  JSCL.Lang.Class("JSCL.UI.Textbox", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.fArray = f;
                      this._kotelezo = kotelezo;
                      this.calcParent(szulo);
                      this.view = document.createElement("INPUT");
                      this.view.type = "text";
                      this.view.name = id;
                      this.view.id = id;
                      this.parent.appendChild(this.view);
                      if (isUndef(f.typeLabel) == false) {
                        var embDiv = document.createElement("SPAN");
                        embDiv.className = "addedTexts";
                        embDiv.appendChild(document.createTextNode(f.typeLabel));
                        this.parent.appendChild(embDiv);
                      }
                      this.view.maxLength = 150;
                      if (gecko) {
                        this.view.autocomplete = "off";
                      }
                      this.view.size = 30;
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      f.helper = (isUndef(f.helper)) ? '0' : f.helper;
                      f.toUpperCase = (isUndef(f.toUpperCase)) ? 'true' : f.toUpperCase;
                      this.convertToUpperCase = (f.toUpperCase == 'true') ? true : false;
                      if (f.helper != '0') {
                        f.value = (isUndef(f.value)) ? '' : f.value.replace(/\n/g, "|");
                      }
                      supr(this).init(id, f, kotelezo);
                      if (f.helper != '0') {
                        f.onHelper = (isUndef(f.onHelper)) ? 'src.jsObject.onHelper();' : f.onHelper;
                        switch (parseInt(f.helper)) {
                          case 100 :
                            f.onHelper = 'src.jsObject.onHelper2();';
                            break;
                          default :
                            break;
                        }

                        this.bHelper = new JSCL.UI.Button(id+'BTN', szulo, {id:id+'BTN',caption:'\u00BB',style_width:"20px"}, '');

            // Firefoxban (helyesen) az örökölt display:block miatt új sorban jelenik meg a helperbutton
//                        this.bHelper = new JSCL.UI.Button(id+'BTN', szulo, {id:id+'BTN',caption:'\u00BB',style_width:"25px",display:"in-line"}, '');

                        this.bHelper.view.gazda = this;
                        this.bHelper.view.jsObject = this;
                        this.bHelper.view.onclick.Add(new Function ("src, ea", f.onHelper));
                      }
                      this.view.onfocus.Add(function(src, ea) {
                        src.select();
                      });
                      this.inEditMode = false;
                      this.setEnterStep();
                    }
                    publ.bHelper;
                    publ.inEditMode;
                    publ.fArray;
                    publ._kotelezo;
                    publ.convertToUpperCase = true;
                    publ.onHelper = function() {
                      if (this.inEditMode) {
                        this.textboxMode();
                      } else {
                        this.textAreaMode();
                      }
                    }
                    publ.onHelper2 = function() {
                      alert("Helper2");
                    }

                    publ.limitText = function(maxLength) {
                      return (this.view.length > maxLength);
                    }

                    publ.textAreaMode = function() {
                      var ertek = this.view.value.replace(/\|/g, "\n");
                      var azon = this.view.id;
                      var parentDisabled = this.view.isDisabled;
                      this.parent.removeChild(this.view);
                      this.view = document.createElement("TEXTAREA");
                      this.view.name = azon;
                      this.view.id = azon;
                      this.parent.insertBefore(this.view, this.bHelper.view);
                      //this.view.maxLength = f.maxLength;
                      if (gecko) {
                        this.view.autocomplete = "off";
                      }
                      this.view.cols = 30;
                      this.view.rows = 10;
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      supr(this).init(azon, this.fArray, this.kotelezo);
                      this.view.value = ertek;
                      this.view.disabled = parentDisabled;
                      this.view.style.fontFamily = 'verdana,sans-serif';
                      this.view.style.fontSize = '9px';
                      this.view.cols = this.fArray.size;
                      this.bHelper.setCaption("\u00AB");
                      this.inEditMode = true;
                      this.view.max=this.fArray.maxLength;
                      this.view.onkeydown.Add(function(src, ea){
                        if (src.value.length > src.max){
                          src.value = src.value.substring(0, src.max);
                        }
                      });
                      this.view.onkeyup.Add(function(src, ea){
                        if (src.value.length > src.max){
                          src.value = src.value.substring(0, src.max);
                        }
                      });
                    }
                    publ.textboxMode = function() {
                      var ertek = this.view.value.replace(/\n/g, "|");
                      var azon = this.view.id;
                      var parentDisabled = this.view.isDisabled;
                      this.parent.removeChild(this.view);
                      this.view = document.createElement("INPUT");
                      this.view.type = "text";
                      this.view.name = azon;
                      this.view.id = azon;
                      this.parent.insertBefore(this.view, this.bHelper.view);
                      //this.view.maxLength = f.maxLength;
                      if (gecko) {
                        this.view.autocomplete = "off";
                      }
                      this.view.size = 30;
                      this.view.rows = 10;
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      supr(this).init(azon, this.fArray, this.kotelezo);
                      this.view.value = ertek;
                      this.view.disabled = parentDisabled;
                      this.bHelper.setCaption("\u00BB");
                      this.inEditMode = false;
                    }

                    publ.onReposition = function() {
                      try {
                        if (this.view.helper != '0') {
                          if (this.inEditMode) {
                            this.view.value = this.datasource.getField(this.view.field);
                          } else {
                            this.view.value = this.datasource.getField(this.view.field).replace(/\n/g, "|");
                          }
                        } else {
                          this.view.value = this.datasource.getField(this.view.field);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                    publ.getValue = function() {
                      if (this.inEditMode) {
                        this.textboxMode;
                      }
                      if (this.convertToUpperCase) {
                        this.view.value = this.view.value.toUpperCase();
                      }
                      return (this.view.value.replace(/\|/g, "\n"));
                    }
                  }
                 )
  ;
;
JSCL.UI.Textarea =
  JSCL.Lang.Class("JSCL.UI.Textarea", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      this.view = document.createElement("TEXTAREA");
                      this.view.name = id;
                      this.view.id = id;
                      this.parent.appendChild(this.view);
                      if (gecko) {
                        this.view.autocomplete = "off";
                      }
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      supr(this).init(id, f, kotelezo);
                      this.view.maxLength = f.maxLength||150;
                      this.view.rows = f.height||3;
                      this.view.cols = f.size||30;
                      if (f.editor == 'true') {
                        this.bEditor = new JSCL.UI.Button(id+'BTN', szulo, {id:id+'BTN',caption:"...",style_width:"25px"}, '');
                        this.bEditor.view.gazda = this;
                        this.bEditor.view.jsObject = this;
                        this.bEditor.view.onclick.Add(function(src, ea) {
                          src.jsObject.onEditor();
                        });
                      }
                      this.view.onfocus.Add(function(src, ea) {
                        src.select();
                      });
                      this.setEnterStep();
                    }
                    publ.bEditor;
                    publ.onEditor = function() {
                      alert(this.id);
                    }
                     publ.getValue = function() {
                      return (this.view.value);
                    }
                    publ.setEnterStep = function() {
                      this.view.onkeydown.Add(function(src, ea) {

                      });
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.Checkbox =
  JSCL.Lang.Class("JSCL.UI.Checkbox", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      this.view = document.createElement("INPUT");
                      this.view.type = "checkbox";
                      this.view.name = id;
                      this.view.id = id;
                      if (typeof(f.tvalue) != 'undefined') {
                        this.view.value= f.tvalue;
                        this.tvalue = f.tvalue;
                      } else {
                        this.view.value= "I";
                        this.tvalue= "I";
                      }
                      if (typeof(f.fvalue) != 'undefined') {
                        this.fvalue= f.fvalue;
                      } else {
                        this.fvalue= 'N';
                      }
                      this.view.jsObject = this;
                      this.parent.appendChild(this.view);
                      if (typeof(f.caption) != 'undefined') {
                        var embDiv = document.createElement("SPAN");
                        addAttribute(embDiv, 'id', 'spanfor_' + id);
                        embDiv.className = "addedTexts";
                        embDiv.appendChild(document.createTextNode(f.caption));
                        this.parent.appendChild(embDiv);
                      }
                      f.checked = (f.checked == 'true');
                      supr(this).init(id, f, kotelezo);
                      this.setValue(this.view.value);
                      this.view.onclick.Add(function(src, ea) { 
                        src.jsObject.onClick(src); 
                      });                      
                      this.setEnterStep();
                    }
                    publ.fvalue;
                    publ.tvalue;
                    publ.setValue = function(value) {
                      this.view.checked = (this.tvalue == value);
                    }
                    publ.getValue = function() {
                      return (this.view.checked ? this.tvalue : this.fvalue);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.checked = (this.view.value == this.datasource.getField(this.view.field));
                      } catch (e) {

                      }
                    }
                    publ.onClick = function(e) {
                      // alert("sssssss");
                      // alert("onClick: "+e.id+"="+e.checked);
                      // alert("onClick: "+this.view.id+"="+this.getValue());
                    }

                  }
                 )
  ;
;
JSCL.UI.Button =
  JSCL.Lang.Class("JSCL.UI.Button", JSCL.UI.Component,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      this.view = document.createElement("A");
                      if(f.disabled == 'true') {
                    	  this.view.className = "button-disabled";
                      } else {
                    	  this.view.className = "button";
                      }
                      this.view.name = id;
                      this.view.id = id;
                      this.view.jsObject = this;
                      this.parent.appendChild(this.view);
                      this.setCaption(f.caption);
                      supr(this).init(id, f, kotelezo);                      
                      if (typeof(f.help) != 'undefined') {
                        addAttribute(this.view, 'title', f.help);
                      }
                      if(!f.href || f.href == '' || f.href=='#') {
                        this.view.href = "#";
                      }
                    }
                    publ.ezaz;
                    publ.setCaption = function(newCap) {
                      this.view.innerText = newCap.replace(/\&amp\;/g, "&").replace(/\&lt\;/g, "<").replace(/\&gt\;/g, ">");
                    }
                  }
                 )
  ;
;
JSCL.UI.Combobox =
  JSCL.Lang.Class("JSCL.UI.Combobox", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      this.view = document.createElement("SELECT");
                      this.view.name = id;
                      this.view.id = id;
                      this.view.jsObject = this;                      
                      this.defval = f.value;
                      this.parent.appendChild(this.view);
                      addAttribute(this.view, "size", 1);
                      supr(this).init(id, f, kotelezo);
                      this.setEnterStep();
                    }
                    publ.defval;
                    publ.onReposition = function() {
                      try {
                        var value = this.datasource.getField(this.view.field);
                        if (value == '') {
                          this.view.selectedIndex = -1;
                        } else {
                          this.view.value = value;
                        }
                      } catch (e) {

                      }
                    }
                    publ.add = function(text, value) {
                    	var l = this.view.options.length;
                    	this.view.options[l] = new Option(text, value);
                      this.view.value = this.defval;
                    }                    
                    publ.addOld = function(text, value) {
                      var oOption = document.createElement("OPTION");
                      oOption.text = text; // .Unescape(String.EscapeTypes.Rate);
                      oOption.value = value; // .Unescape(String.EscapeTypes.Rate);
                      if (msie) {
                        this.view.add(oOption);
                      } else {
                        this.view.appendChild(oOption);
                      }
                      this.view.value = this.defval;
                    }
                    publ.clear = function() {
                      var aOptions = this.view.options;
                      if (aOptions != null) {
                        var l = aOptions.length;
                        for (var i = 0; i < l; i++) {
                          this.view.remove(0);
                        }
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value); // .Escape(String.EscapeTypes.Rate));
                    }
                  }
                 )
  ;
;
JSCL.UI.DBCombobox =
  JSCL.Lang.Class("JSCL.UI.DBCombobox", JSCL.UI.Combobox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.oriDisabled = isUndef(f.disabled) ? "false" : f.disabled;
                    }
                    publ.oriDisabled;
                    publ.itemds;
                    publ.itemcaption;
                    publ.itemvalue;
                    publ.setItemData = function(itemds, itemcaption, itemvalue) {
                      this.itemds = itemds;
                      this.itemcaption = itemcaption;
                      this.itemvalue = itemvalue;
                      this.itemds.addListener(this);
                    }
                    publ.onItemFiltering = function() {
                      this.clear();
                      var iDS = this.itemds;
								      var recC = iDS.getCount();
								      for (var i = 1; i <= recC; i++) {
								        iDS.setPosition(i);
								        this.add(iDS.getField(this.itemcaption), iDS.getField(this.itemvalue));								       
								      }                      
								      switch (recC) {
								        case 0 :
  								        this.view.selectedIndex = -1;
								          this.view.disabled = true;
								          break;
								        case 1 :
  								        this.view.selectedIndex = 0;
								          this.view.disabled = true;
								          break;
								        default :
								          if (this.oriDisabled == "true") {
								            this.view.disabled = true;
								          } else {
  								          this.view.disabled = false;
  								        }
								      }
                    }
                  }
                 )
  ;
;
JSCL.UI.Listbox =
  JSCL.Lang.Class("JSCL.UI.Listbox", JSCL.UI.Combobox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.jsObject = this;
                      if (isUndef(f.size)) {
                        this.view.size = 10;
                      } else {
                        this.view.size = f.size;
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.DBListbox =
  JSCL.Lang.Class("JSCL.UI.DBListbox", JSCL.UI.DBCombobox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.jsObject = this;
                      if (isUndef(f.size)) {
                        this.view.size = 10;
                      } else {
                        this.view.size = f.size;
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.DblListbox =
  JSCL.Lang.Class("JSCL.UI.DblListbox",
                  function(publ) {
                    publ.init = function(id, szulo, f) {
                      this.id = id;
                      var jsclIDAUXWJC = new JSCL.UI.Generic('table', szulo, {border:"0",width:"100%"});          
                      var jsclIDAYXWJC = new JSCL.UI.Generic('tbody', jsclIDAUXWJC.content, {});          
                      var jsclIDAXXWJC = new JSCL.UI.Generic('tr', jsclIDAYXWJC.content, {});          
                      var jsclIDA0XWJC = new JSCL.UI.Generic('td', jsclIDAXXWJC.content, {align:"left"});
                      addStyledText(jsclIDA0XWJC.content, "Elérhetõ:");
                      jsclIDA0XWJC.content.appendChild(document.createElement("BR"));
                      this.lbAvailable = new JSCL.UI.Listbox(id+'Available', jsclIDA0XWJC.view, {}, false);
                      this.lbAvailable.view.jsObject = this;
                      this.lbAvailable.view.ondblclick = (new JSCL.Events.Listener()).Invoke;
                      this.lbAvailable.view.ondblclick.Add(function(src, ea) { 
                        src.jsObject.addSelection();
                      });                                           
                      var jsclIDBXXWJC = new JSCL.UI.Generic('tr', jsclIDAYXWJC.content, {});          
                      var jsclIDAPXWJC = new JSCL.UI.Generic('td', jsclIDBXXWJC.content, {align:"left"});
                      addStyledText(jsclIDAPXWJC.content, "Kiválasztott:");
                      jsclIDAPXWJC.content.appendChild(document.createElement("BR"));
                      this.lbSelected = new JSCL.UI.Listbox(id, jsclIDAPXWJC.view, {}, false);
                      this.lbSelected.view.jsObject = this;
                      this.lbSelected.view.ondblclick = (new JSCL.Events.Listener()).Invoke;
                      this.lbSelected.view.ondblclick.Add(function(src, ea) { 
                        src.jsObject.delSelection();
                      });                                           
                      if (isUndef(f.disabled) == false) {
                        if (f.disabled == "true") {
                          this.lbAvailable.view.disabled = true;
                          this.lbSelected.view.disabled = true;
                        }
                      }
                    }
                    publ.id;
                    publ.lbAvailable;
                    publ.lbSelected;
                    publ.add = function(text, value, allapot) {
                      allapot = isUndef(allapot) ? "false" : allapot;                      
                      if (allapot == "true") {
                        this.lbSelected.add(text, value);
                      } else {
                        this.lbAvailable.add(text, value);
                      }
                    }                    
                    publ.delSelection = function () {
                       var selIndex = this.lbSelected.view.selectedIndex;
                       if (selIndex < 0) {
                          return;
                       }
                       this.lbAvailable.view.appendChild(this.lbSelected.view.options.item(selIndex));
                    }
                    publ.selectByValue = function(value) {
                    	this.lbAvailable.view.value = value;
                    	this.addSelection();                    	
                    }
                    publ.addSelected = function(idx) {
                    	var lista = this.lbAvailable.view;                    	
                    	lista.selectedIndex = idx;
                    	this.addSelection();
                    }
                    publ.addSelection = function() {
                       var addIndex = this.lbAvailable.view.selectedIndex;
                       if (addIndex < 0) {
                          return;
                       }
                       this.lbSelected.view.appendChild(this.lbAvailable.view.options.item(addIndex));
                       this.lbSelected.view.selectedIndex = 0;
                    }                    
                    publ.getValue = function() {
                      var retval = "";
                      var elemek = this.lbSelected.view.options;
                      var l = elemek.length;
                      if (l >= 0) {
                        for (var i = 0; i < l; i++) {
                          var elem = elemek.item(i);
                          if (i == 0) {
                            retval = elem.value;
                          } else {
                            retval = retval+'|'+elem.value;
                          }
                        }
                      }
                      return (retval);
                    }                   
                    publ.setData = function(ds) {
                    }
                    publ.onValidate = function() {
                      return (true);
                    }
                    publ.onNecessity = function() {
                      return (true);
                    }
                    publ.getId = function() {
                      return (this.id);
                    }
                    publ.onFiltering = function() {
                      //
                    }                    
                    publ.dispose = function() {
                      this.view = null;
                      this.content = null;
                      this.parent = null;
                    }
                  }
                 )
  ;
;
var __radio_elemNum = 0;
JSCL.UI.Radio = JSCL.Lang.Class("JSCL.UI.Radio", JSCL.UI.DBComponent, function(
    publ, supr) {
  publ.init = function(id, szulo, f, kotelezo) {
    this.calcParent(szulo);
    __radio_elemNum = 0;
    this.view = document.createElement("SPAN");
    this.view.name = id + "_span";
    this.view.id = id + "_span";
    this.radioId = id;
    this.disabled = f.disabled;
    this._command = f.command;
    if (isUndef(f.orientation) == false) {
      this.orientation = f.orientation != "horizontal";
    } else {
      this.orientation = false;
    }
    this.view.jsObject = this;
    this.parent.appendChild(this.view);
    supr(this).init(id + "_span", f, kotelezo);
    this.setEnterStep();
  }
  publ.radioId;
  publ._command;
  publ.disabled;

  publ.onReposition = function() {
    try {
      var ertek = this.datasource.getField(this.view.field);
      this.setValueState(this.view, ertek);
    } catch (e) {

    }
  }
  publ.getId = function() {
    return (this.radioId);
  }
  publ.getValue = function() {
    var elemek = this.view.getElementsByTagName("INPUT");
    var l = elemek.length;
    for (var i = 0; i < l; i++) {
      if (elemek[i].checked) {
        return (elemek[i].value);
      }
    }
    return ('');
  }
  publ.setValue = function(value) {
    this.view.value = value;
    this.setValueState(this.view, value);
  }
  publ.setValueState = function(cont, ertek) {
    var elemek = cont.getElementsByTagName("INPUT");
    var l = elemek.length;
    for (var i = 0; i < l; i++) {
      elemek[i].checked = (elemek[i].value == ertek);
    }
  }
  publ.setCheckState = function(cont, id) {
    var elemek = cont.getElementsByTagName("INPUT");
    var l = elemek.length;
    for (var i = 0; i < l; i++) {
      elemek[i].checked = (elemek[i].id == id);
    }
  }
  publ.add = function(text, value) {
    __radio_elemNum++;
    var elem = document.createElement("INPUT");
    if (msie && false) {
      addAttribute(elem, 'type', 'radio');
      addAttribute(elem, 'id', this.radioId + __radio_elemNum);
      addAttribute(elem, 'name', this.radioId);
      addAttribute(elem, 'value', value);
      addAttribute(elem, 'jsObject', this);
      addAttribute(elem, 'disabled', this.disabled);
      addAttribute(elem, 'command',
          (typeof(this._command) == 'undefined')
              ? null
              : this._command);
      elem.name = this.radioId;
      elem.jsObject = this;
    } else {
      elem.type = "radio";
      elem.disabled = this.disabled;
      elem.id = this.radioId + __radio_elemNum;
      elem.name = this.radioId;
      elem.value = value;
      elem.jsObject = this;
      elem.command = this._command;
      elem.className = "input-nobackground";
    }
    this.view.appendChild(elem);
    if (text != '') {
      var embDiv = document.createElement("SPAN");
      embDiv.className = "addedTexts radioLabel";
      embDiv.appendChild(document.createTextNode(text));
      this.view.appendChild(embDiv);
    }
    if (this.orientation) {
      this.view.appendChild(document.createElement("BR"));
    }
    this.setValueState(this.view, this.view.value);
    elem.onclick = (new JSCL.Events.Listener()).Invoke;
    elem.onclick.Add(function(src, ea) {
      src.jsObject.setCheckState(src.jsObject.parent, src.id);
      src.jsObject.onClick(src);
      //alert(document.getElementById("eFajta_span").jsObject.getValue());
    });
  }
  publ.onClick = function(e) {
    if (e.command != null) {
      eval(e.command + "('" + e.value + "');");
    }
  }
});;
JSCL.UI.YesNoRadio =
  JSCL.Lang.Class("JSCL.UI.YesNoRadio", JSCL.UI.Radio,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.jsObject = this;
                      this.add("Igen", "I");
                      this.add("Nem", "N");
                    }
                  }
                 )
  ;
;
JSCL.UI.Datebox =
  JSCL.Lang.Class("JSCL.UI.Datebox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.maxLength = 10;
                      this.view.size = 11;
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      var elem = this.view;
                      if(f.datepopup == "true" && this.view.disabled == false) {
                    	  this.view.onclick.Add(this.displayPopup);
                      }
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);                                            
                        } else {
                          this.view.onblur.Add(this.validate);                      
                        }
                      }
                    }
                    publ.validate = function(src, ea) {
                      if (isDate(src) == false) {
                        alert("Hibás dátum, helyesen: ÉÉÉÉ.HH.NN");
                        src.select();
                        src.focus();                          
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.displayPopup = function(src, ea) {
                    	displayDatePicker(src.id);
                    }
                  }
                 )
  ;
;

/**
This is a JavaScript library that will allow you to easily add some basic DHTML
drop-down datepicker functionality to your Notes forms. This script is not as
full-featured as others you may find on the Internet, but it's free, it's easy to
understand, and it's easy to change.

You'll also want to include a stylesheet that makes the datepicker elements
look nice. An example one can be found in the database that this script was
originally released with, at:

http://www.nsftools.com/tips/NotesTips.htm#datepicker

I've tested this lightly with Internet Explorer 6 and Mozilla Firefox. I have no idea
how compatible it is with other browsers.

version 1.5
December 4, 2005
Julian Robichaux -- http://www.nsftools.com

HISTORY
--  version 1.0 (Sept. 4, 2004):
Initial release.

--  version 1.1 (Sept. 5, 2004):
Added capability to define the date format to be used, either globally (using the
defaultDateSeparator and defaultDateFormat variables) or when the displayDatePicker
function is called.

--  version 1.2 (Sept. 7, 2004):
Fixed problem where datepicker x-y coordinates weren't right inside of a table.
Fixed problem where datepicker wouldn't display over selection lists on a page.
Added a call to the datePickerClosed function (if one exists) after the datepicker
is closed, to allow the developer to add their own custom validation after a date
has been chosen. For this to work, you must have a function called datePickerClosed
somewhere on the page, that accepts a field object as a parameter. See the
example in the comments of the updateDateField function for more details.

--  version 1.3 (Sept. 9, 2004)
Fixed problem where adding the <div> and <iFrame> used for displaying the datepicker
was causing problems on IE 6 with global variables that had handles to objects on
the page (I fixed the problem by adding the elements using document.createElement()
and document.body.appendChild() instead of document.body.innerHTML += ...).

--  version 1.4 (Dec. 20, 2004)
Added "targetDateField.focus();" to the updateDateField function (as suggested
by Alan Lepofsky) to avoid a situation where the cursor focus is at the top of the
form after a date has been picked. Added "padding: 0px;" to the dpButton CSS
style, to keep the table from being so wide when displayed in Firefox.

-- version 1.5 (Dec 4, 2005)
Added display=none when datepicker is hidden, to fix problem where cursor is
not visible on input fields that are beneath the date picker. Added additional null
date handling for date errors in Safari when the date is empty. Added additional
error handling for iFrame creation, to avoid reported errors in Opera. Added
onMouseOver event for day cells, to allow color changes when the mouse hovers
over a cell (to make it easier to determine what cell you're over). Added comments
in the style sheet, to make it more clear what the different style elements are for.
*/

var datePickerDivID = "datepicker";
var iFrameDivID = "datepickeriframe";

var dayArrayShort = new Array('V', 'H', 'K', 'Sz', 'Cs', 'P', 'Sz');
var dayArrayMed = new Array('Va', 'He', 'Ke', 'Sze', 'Csü', 'Pe', 'Szo');
var dayArrayLong = new Array('Vasárnap', 'Hétfö', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat');
var monthArrayShort = new Array('Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec');
var monthArrayMed = new Array('Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec');
var monthArrayLong = new Array('Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December');
 
// these variables define the date formatting we're expecting and outputting.
// If you want to use a different format by default, change the defaultDateSeparator
// and defaultDateFormat variables either here or on your HTML page.
var defaultDateSeparator = ".";        // common values would be "/" or "."
var defaultDateFormat = "ymd"    // valid values are "mdy", "dmy", and "ymd"
var dateSeparator = defaultDateSeparator;
var dateFormat = defaultDateFormat;

/**
This is the main function you'll call from the onClick event of a button.
Normally, you'll have something like this on your HTML page:

Start Date: <input name="StartDate">
<input type=button value="select" onclick="displayDatePicker('StartDate');">

That will cause the datepicker to be displayed beneath the StartDate field and
any date that is chosen will update the value of that field. If you'd rather have the
datepicker display beneath the button that was clicked, you can code the button
like this:

<input type=button value="select" onclick="displayDatePicker('StartDate', this);">

So, pretty much, the first argument (dateFieldName) is a string representing the
name of the field that will be modified if the user picks a date, and the second
argument (displayBelowThisObject) is optional and represents an actual node
on the HTML document that the datepicker should be displayed below.

In version 1.1 of this code, the dtFormat and dtSep variables were added, allowing
you to use a specific date format or date separator for a given call to this function.
Normally, you'll just want to set these defaults globally with the defaultDateSeparator
and defaultDateFormat variables, but it doesn't hurt anything to add them as optional
parameters here. An example of use is:

<input type=button value="select" onclick="displayDatePicker('StartDate', false, 'dmy', '.');">

This would display the datepicker beneath the StartDate field (because the
displayBelowThisObject parameter was false), and update the StartDate field with
the chosen value of the datepicker using a date format of dd.mm.yyyy
*/
function displayDatePicker(dateFieldName, displayBelowThisObject, dtFormat, dtSep)
{
  var targetDateField = document.getElementsByName (dateFieldName).item(0);
 
  // if we weren't told what node to display the datepicker beneath, just display it
  // beneath the date field we're updating
  if (!displayBelowThisObject)
    displayBelowThisObject = targetDateField;
 
  // if a date separator character was given, update the dateSeparator variable
  if (dtSep)
    dateSeparator = dtSep;
  else
    dateSeparator = defaultDateSeparator;
 
  // if a date format was given, update the dateFormat variable
  if (dtFormat)
    dateFormat = dtFormat;
  else
    dateFormat = defaultDateFormat;
 
  var x = displayBelowThisObject.offsetLeft;
  var y = displayBelowThisObject.offsetTop + displayBelowThisObject.offsetHeight ;
 
  // deal with elements inside tables and such
  var parent = displayBelowThisObject;
  while (parent.offsetParent) {
    parent = parent.offsetParent;
    x += parent.offsetLeft;
    y += parent.offsetTop ;
  }
 
  drawDatePicker(targetDateField, x, y);
}


/**
Draw the datepicker object (which is just a table with calendar elements) at the
specified x and y coordinates, using the targetDateField object as the input tag
that will ultimately be populated with a date.

This function will normally be called by the displayDatePicker function.
*/
function drawDatePicker(targetDateField, x, y)
{
  var dt = getFieldDate(targetDateField.value );
 
  // the datepicker table will be drawn inside of a <div> with an ID defined by the
  // global datePickerDivID variable. If such a div doesn't yet exist on the HTML
  // document we're working with, add one.
  if (!document.getElementById(datePickerDivID)) {
    // don't use innerHTML to update the body, because it can cause global variables
    // that are currently pointing to objects on the page to have bad references
    //document.body.innerHTML += "<div id='" + datePickerDivID + "' class='dpDiv'></div>";
    var newNode = document.createElement("div");
    newNode.setAttribute("id", datePickerDivID);
    newNode.setAttribute("class", "dpDiv");
    newNode.setAttribute("style", "visibility: hidden;");
    document.body.appendChild(newNode);
  }
 
  // move the datepicker div to the proper x,y coordinate and toggle the visiblity
  var pickerDiv = document.getElementById(datePickerDivID);
  pickerDiv.style.position = "absolute";
  pickerDiv.style.left = x + "px";
  pickerDiv.style.top = y + "px";
  pickerDiv.style.visibility = (pickerDiv.style.visibility == "visible" ? "hidden" : "visible");
  pickerDiv.style.display = (pickerDiv.style.display == "block" ? "none" : "block");
  pickerDiv.style.zIndex = 10000;
 
  // draw the datepicker table
  refreshDatePicker(targetDateField.name, dt.getFullYear(), dt.getMonth(), dt.getDate());
}


/**
This is the function that actually draws the datepicker calendar.
*/
function refreshDatePicker(dateFieldName, year, month, day)
{
  // if no arguments are passed, use today's date; otherwise, month and year
  // are required (if a day is passed, it will be highlighted later)
  var thisDay = new Date();
 
  if ((month >= 0) && (year > 0)) {
    thisDay = new Date(year, month, 1);
  } else {
    day = thisDay.getDate();
    thisDay.setDate(1);
  }
 
  // the calendar will be drawn as a table
  // you can customize the table elements with a global CSS style sheet,
  // or by hardcoding style and formatting elements below
  var crlf = "\r\n";
  var TABLE = "<table cols=7 class='dpTable'>" + crlf;
  var xTABLE = "</table>" + crlf;
  var TR = "<tr class='dpTR'>";
  var TR_title = "<tr class='dpTitleTR'>";
  var TR_days = "<tr class='dpDayTR'>";
  var TR_todaybutton = "<tr class='dpTodayButtonTR'>";
  var xTR = "</tr>" + crlf;
  var TD = "<td class='dpTD' onMouseOut='this.className=\"dpTD\";' onMouseOver=' this.className=\"dpTDHover\";' ";    // leave this tag open, because we'll be adding an onClick event
  var TD_title = "<td colspan=5 class='dpTitleTD'>";
  var TD_buttons = "<td class='dpButtonTD'>";
  var TD_todaybutton = "<td colspan=7 class='dpTodayButtonTD'>";
  var TD_days = "<td class='dpDayTD'>";
  var TD_selected = "<td class='dpDayHighlightTD' onMouseOut='this.className=\"dpDayHighlightTD\";' onMouseOver='this.className=\"dpTDHover\";' ";    // leave this tag open, because we'll be adding an onClick event
  var xTD = "</td>" + crlf;
  var DIV_title = "<div class='dpTitleText'>";
  var DIV_selected = "<div class='dpDayHighlight'>";
  var xDIV = "</div>";
 
  // start generating the code for the calendar table
  var html = TABLE;
 
  // this is the title bar, which displays the month and the buttons to
  // go back to a previous month or forward to the next month
  html += TR_title;
  html += TD_buttons + getButtonCode(dateFieldName, thisDay, -1, "&lt;") + xTD;
  html += TD_title + DIV_title + monthArrayLong[ thisDay.getMonth()] + " " + thisDay.getFullYear() + xDIV + xTD;
  html += TD_buttons + getButtonCode(dateFieldName, thisDay, 1, "&gt;") + xTD;
  html += xTR;
 
  // this is the row that indicates which day of the week we're on
  html += TR_days;
  for(i = 0; i < dayArrayShort.length; i++)
    html += TD_days + dayArrayShort[i] + xTD;
  html += xTR;
 
  // now we'll start populating the table with days of the month
  html += TR;
 
  // first, the leading blanks
  for (i = 0; i < thisDay.getDay(); i++)
    html += TD + "&nbsp;" + xTD;
 
  // now, the days of the month
  do {
    dayNum = thisDay.getDate();
    TD_onclick = " onclick=\"updateDateField('" + dateFieldName + "', '" + getDateString(thisDay) + "');\">";
    
    if (dayNum == day)
      html += TD_selected + TD_onclick + DIV_selected + dayNum + xDIV + xTD;
    else
      html += TD + TD_onclick + dayNum + xTD;
    
    // if this is a Saturday, start a new row
    if (thisDay.getDay() == 6)
      html += xTR + TR;
    
    // increment the day
    thisDay.setDate(thisDay.getDate() + 1);
  } while (thisDay.getDate() > 1)
 
  // fill in any trailing blanks
  if (thisDay.getDay() > 0) {
    for (i = 6; i > thisDay.getDay(); i--)
      html += TD + "&nbsp;" + xTD;
  }
  html += xTR;
 
  // add a button to allow the user to easily return to today, or close the calendar
  var today = new Date();
  var todayString = "Mai nap: " + dayArrayMed[today.getDay()] + ", " + monthArrayMed[ today.getMonth()] + " " + today.getDate();
  html += TR_todaybutton + TD_todaybutton;
  html += "<button class='dpTodayButton' onClick='refreshDatePicker(\"" + dateFieldName + "\");'>E hónap</button> ";
  html += "<button class='dpTodayButton' onClick='updateDateField(\"" + dateFieldName + "\");'>Bezár</button>";
  html += xTD + xTR;
 
  // and finally, close the table
  html += xTABLE;
 
  document.getElementById(datePickerDivID).innerHTML = html;
  // add an "iFrame shim" to allow the datepicker to display above selection lists
  adjustiFrame();
}


/**
Convenience function for writing the code for the buttons that bring us back or forward
a month.
*/
function getButtonCode(dateFieldName, dateVal, adjust, label)
{
  var newMonth = (dateVal.getMonth () + adjust) % 12;
  var newYear = dateVal.getFullYear() + parseInt((dateVal.getMonth() + adjust) / 12);
  if (newMonth < 0) {
    newMonth += 12;
    newYear += -1;
  }
 
  return "<button class='dpButton' onClick='refreshDatePicker(\"" + dateFieldName + "\", " + newYear + ", " + newMonth + ");'>" + label + "</button>";
}


/**
Convert a JavaScript Date object to a string, based on the dateFormat and dateSeparator
variables at the beginning of this script library.
*/
function getDateString(dateVal)
{
  var dayString = "00" + dateVal.getDate();
  var monthString = "00" + (dateVal.getMonth()+1);
  dayString = dayString.substring(dayString.length - 2);
  monthString = monthString.substring(monthString.length - 2);
 
  switch (dateFormat) {
    case "dmy" :
      return dayString + dateSeparator + monthString + dateSeparator + dateVal.getFullYear();
    case "ymd" :
      return dateVal.getFullYear() + dateSeparator + monthString + dateSeparator + dayString;
    case "mdy" :
    default :
      return monthString + dateSeparator + dayString + dateSeparator + dateVal.getFullYear();
  }
}


/**
Convert a string to a JavaScript Date object.
*/
function getFieldDate(dateString)
{
  var dateVal;
  var dArray;
  var d, m, y;
 
  try {
    dArray = splitDateString(dateString);
    if (dArray) {
      switch (dateFormat) {
        case "dmy" :
          d = parseInt(dArray[0], 10);
          m = parseInt(dArray[1], 10) - 1;
          y = parseInt(dArray[2], 10);
          break;
        case "ymd" :
          d = parseInt(dArray[2], 10);
          m = parseInt(dArray[1], 10) - 1;
          y = parseInt(dArray[0], 10);
          break;
        case "mdy" :
        default :
          d = parseInt(dArray[1], 10);
          m = parseInt(dArray[0], 10) - 1;
          y = parseInt(dArray[2], 10);
          break;
      }
      dateVal = new Date(y, m, d);
    } else if (dateString) {
      dateVal = new Date(dateString);
    } else {
      dateVal = new Date();
    }
  } catch(e) {
    dateVal = new Date();
  }
 
  return dateVal;
}


/**
Try to split a date string into an array of elements, using common date separators.
If the date is split, an array is returned; otherwise, we just return false.
*/
function splitDateString(dateString)
{
  var dArray;
  if (dateString.indexOf("/") >= 0)
    dArray = dateString.split("/");
  else if (dateString.indexOf(".") >= 0)
    dArray = dateString.split(".");
  else if (dateString.indexOf("-") >= 0)
    dArray = dateString.split("-");
  else if (dateString.indexOf("\\") >= 0)
    dArray = dateString.split("\\");
  else
    dArray = false;
 
  return dArray;
}

/**
Update the field with the given dateFieldName with the dateString that has been passed,
and hide the datepicker. If no dateString is passed, just close the datepicker without
changing the field value.

Also, if the page developer has defined a function called datePickerClosed anywhere on
the page or in an imported library, we will attempt to run that function with the updated
field as a parameter. This can be used for such things as date validation, setting default
values for related fields, etc. For example, you might have a function like this to validate
a start date field:

function datePickerClosed(dateField)
{
  var dateObj = getFieldDate(dateField.value);
  var today = new Date();
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
 
  if (dateField.name == "StartDate") {
    if (dateObj < today) {
      // if the date is before today, alert the user and display the datepicker again
      alert("Please enter a date that is today or later");
      dateField.value = "";
      document.getElementById(datePickerDivID).style.visibility = "visible";
      adjustiFrame();
    } else {
      // if the date is okay, set the EndDate field to 7 days after the StartDate
      dateObj.setTime(dateObj.getTime() + (7 * 24 * 60 * 60 * 1000));
      var endDateField = document.getElementsByName ("EndDate").item(0);
      endDateField.value = getDateString(dateObj);
    }
  }
}

*/
function updateDateField(dateFieldName, dateString)
{
  var targetDateField = document.getElementsByName (dateFieldName).item(0);
  if (dateString)
    targetDateField.value = dateString;
 
  var pickerDiv = document.getElementById(datePickerDivID);
  pickerDiv.style.visibility = "hidden";
  pickerDiv.style.display = "none";
 
  adjustiFrame();
  targetDateField.focus();
 
  // after the datepicker has closed, optionally run a user-defined function called
  // datePickerClosed, passing the field that was just updated as a parameter
  // (note that this will only run if the user actually selected a date from the datepicker)
  if ((dateString) && (typeof(datePickerClosed) == "function"))
    datePickerClosed(targetDateField);
}


/**
Use an "iFrame shim" to deal with problems where the datepicker shows up behind
selection list elements, if they're below the datepicker. The problem and solution are
described at:

http://dotnetjunkies.com/WebLog/jking/archive/2003/07/21/488.aspx
http://dotnetjunkies.com/WebLog/jking/archive/2003/10/30/2975.aspx
*/
function adjustiFrame(pickerDiv, iFrameDiv)
{
  // we know that Opera doesn't like something about this, so if we
  // think we're using Opera, don't even try
  var is_opera = (navigator.userAgent.toLowerCase().indexOf("opera") != -1);
  if (is_opera)
    return;
  
  // put a try/catch block around the whole thing, just in case
  try {
    if (!document.getElementById(iFrameDivID)) {
      // don't use innerHTML to update the body, because it can cause global variables
      // that are currently pointing to objects on the page to have bad references
      //document.body.innerHTML += "<iframe id='" + iFrameDivID + "' src='javascript:false;' scrolling='no' frameborder='0'>";
      var newNode = document.createElement("iFrame");
      newNode.setAttribute("id", iFrameDivID);
      newNode.setAttribute("src", "javascript:false;");
      newNode.setAttribute("scrolling", "no");
      newNode.setAttribute ("frameborder", "0");
      document.body.appendChild(newNode);
    }
    
    if (!pickerDiv)
      pickerDiv = document.getElementById(datePickerDivID);
    if (!iFrameDiv)
      iFrameDiv = document.getElementById(iFrameDivID);
    
    try {
      iFrameDiv.style.position = "absolute";
      iFrameDiv.style.width = pickerDiv.offsetWidth;
      iFrameDiv.style.height = pickerDiv.offsetHeight ;
      iFrameDiv.style.top = pickerDiv.style.top;
      iFrameDiv.style.left = pickerDiv.style.left;
      iFrameDiv.style.zIndex = pickerDiv.style.zIndex - 1;
      iFrameDiv.style.visibility = pickerDiv.style.visibility ;
      iFrameDiv.style.display = pickerDiv.style.display;
    } catch(e) {
    }
 
  } catch (ee) {
  }
 
}



JSCL.UI.Numbox =
  JSCL.Lang.Class("JSCL.UI.Numbox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      var elem = this.view;
                      elem.style.textAlign = 'right';
                      elem.jsObject = this;
                      if (isUndef(elem.separator)) {
                        elem.separator = ' ';
                      }
                      if (isUndef(elem.dot)) {
                        elem.dot = '.';
                      }
                      // addAttribute(this.view, 'align', 'right');
                      if (elem.separate == 'true') {
                        removeThousandSepar(elem, elem.separator);
                        insertThousandSepar(elem, elem.separator, elem.dot);
                        elem.onfocus.Add(function(src, ea) {
                          removeThousandSepar(src, src.jsObject.view.separator);
                          src.select();
                        });
                        elem.onblur.Add(function(src, ea) {
                          if (src.jsObject.view.separate == 'true') {
                            insertThousandSepar(src, src.jsObject.view.separator,  src.jsObject.view.dot);
                          }
                        });
                      }
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          elem.onbeforedeactivate.Add(this.validate);
                        } else {
                          elem.onblur.Add(this.validate);
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkNumber(src, src.jsObject.view.separator,  src.jsObject.view.dot) == false) {
                        alert("Hibás szám/összeg érték !");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value.split(this.view.separator).join('').replace(/\,/g, '.'));
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field).replace(/\./g, this.view.dot);
                        if(this.view.value.charAt(0) == '.' || this.view.value.charAt(0) == ',') {
                        	this.view.value = '0' + this.view.value;
                        }
                        if (this.view.separate == 'true') {
                          insertThousandSepar(this.view, this.view.separator, this.view.dot);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.PersonNumbox =
  JSCL.Lang.Class("JSCL.UI.PersonNumbox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.size = 16;
                      this.view.maxLength = 11;
                      this.view.jsObject = this;
                      // addAttribute(this.view, 'align', 'right');
                      var elem = this.view;
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);                      
                        } else {
                          this.view.onblur.Add(this.validate);                      
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkPersonNumElem(src) == false) {
                        alert("Hibás személyi szám !");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value.split(' ').join(''));
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                        if (this.view.separate == 'true') {
                          insertThousandSepar(this.view);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.TaxNumbox =
  JSCL.Lang.Class("JSCL.UI.TaxNumbox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.size = 20;
                      this.view.maxLength = 10;
                      this.view.jsObject = this;
                      // addAttribute(this.view, 'align', 'right');
                      var elem = this.view;
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);                      
                        } else {
                          this.view.onblur.Add(this.validate);                      
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkTaxNumElem(src) == false) {
                        alert("Hibás adóazonosító jel !");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value.split(' ').join(''));
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                        if (this.view.separate == 'true') {
                          insertThousandSepar(this.view);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.BusinessTaxNumbox =
  JSCL.Lang.Class("JSCL.UI.BusinessTaxNumbox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.size = 13;
                      this.view.maxLength = 11;
                      this.view.jsObject = this;
                      // addAttribute(this.view, 'align', 'right');
                      var elem = this.view;
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);                      
                        } else {
                          this.view.onblur.Add(this.validate);                      
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkBusinessTaxNumElem(src) == false) {
                        alert("Hibás cég adószám!");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value.split(' ').join(''));
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                        if (this.view.separate == 'true') {
                          insertThousandSepar(this.view);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.Moneybox =
  JSCL.Lang.Class("JSCL.UI.Moneybox", JSCL.UI.Numbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.jsObject = this;
                      if (isUndef(f.deviza) == false && false) {
                        var embDiv = document.createElement("SPAN");
                        embDiv.className = "addedTexts";
                        embDiv.appendChild(document.createTextNode(f.deviza));
                        this.parent.appendChild(embDiv);
                      }                      
                    }
                  }
                 )
  ;
;
JSCL.UI.Bszlabox =
  JSCL.Lang.Class("JSCL.UI.Bszlabox", JSCL.UI.Textbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.size = 34;
                      this.view.maxLength = 26;
                      this.view.jsObject = this;
                      // addAttribute(this.view, 'align', 'right');
                      var elem = this.view;
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);
                        } else {
                          this.view.onblur.Add(this.validate);
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkBszlaElem(src) == false) {
                        alert("Hibás számlaszám, CDV vagy formátum gond van.\nHelyesen: 99999999-99999999-99999999.");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.value.split(' ').join(''));
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    publ.onReposition = function() {
                      try {
                        this.view.value = this.datasource.getField(this.view.field);
                        if (this.view.separate == 'true') {
                          insertThousandSepar(this.view);
                        }
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                  }
                 )
  ;
;
JSCL.UI.Percentbox =
  JSCL.Lang.Class("JSCL.UI.Percentbox", JSCL.UI.Numbox,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      this.view.jsObject = this;
                      this.view.size = 5;
                      this.view.maxLength = 3;
                      if (typeof(f.percent) != 'undefined') {
                        var embDiv = document.createElement("SPAN");
                        embDiv.className = "addedTexts";
                        embDiv.appendChild(document.createTextNode(f.percent));
                        this.parent.appendChild(embDiv);
                      }                      
                      if (this.FIELD_VALIDATION) {
                        if (msie) {
                          this.view.onbeforedeactivate.Add(this.validate);
                        } else {
                          this.view.onblur.Add(this.validate);
                        }
                      }
                    }
                    publ.validate = function (src, ea) {
                      if (checkPercent(src) == false) {
                        alert("Az értéknek 0 és 100 közé kell esnie !");
                        src.select();
                        src.focus();
                        throw new JSCL.Events.RevokeException("Hiba");
                      }
                    }
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                  }
                 )
  ;
;
JSCL.UI.DBNavigator =
  JSCL.Lang.Class("JSCL.UI.DBNavigator", JSCL.UI.Object,
                  function(publ, supr) {
                    publ.init = function(id, szulo, grid, form, fgi) {
                    	var self = this;
                      supr(this).init();
                      this.grid = grid;
                      this.oForm = form;
                      this.fgi = fgi;
                      grid.datasource.removeNavigators();
                      grid.datasource.addListener(this);
                      this.id = id;
                      this.objuid = _objuid++;
                      this.bMoveFirst = new JSCL.UI.Button("bFirst", szulo, {caption:"<<", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveFirst.view.style.cssText = this.bMoveFirst.view.style.cssText + ';display: inline-block;';
                      this.bMoveFirst.view.gazda = this;
                      this.bMoveFirst.view.onclick = function(){
                    	  this.gazda.grid.selectRow(0, false)
                      };
                      this.bMovePrev = new JSCL.UI.Button("bPrev", szulo, {caption:"<", style_width:"55px", style_marginRight:"5px"});
                      this.bMovePrev.view.style.cssText = this.bMovePrev.view.style.cssText + ';display: inline-block;';
                      this.bMovePrev.view.gazda = this;
                      this.bMovePrev.view.onclick = function(){
						if (this.gazda.grid.getSelectedRow() != 0){
							this.gazda.grid.selectRow(this.gazda.grid.getSelectedRow() - 1 , false);
					  };
                      															};
                      this.bMoveNext = new JSCL.UI.Button("bNext", szulo, {caption:">", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveNext.view.style.cssText = this.bMoveNext.view.style.cssText + ';display: inline-block;';
                      this.bMoveNext.view.gazda = this;
                      this.bMoveNext.view.onclick = function(){
						if (this.gazda.grid.getSelectedRow() != this.gazda.grid.getRowCount() - 1){
						  this.gazda.grid.selectRow(this.gazda.grid.getSelectedRow() + 1 , false);
						};
					  };
                      this.bMoveLast = new JSCL.UI.Button("bLast", szulo, {caption:">>", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveLast.view.style.cssText = this.bMoveLast.view.style.cssText + ';display: inline-block;';
                      this.bMoveLast.view.gazda = this;
                      this.bMoveLast.view.onclick = function(){
						this.gazda.grid.selectRow(this.gazda.grid.getRowCount() - 1, false)
					  };
                      
                      //*****************************
                      
                      this.bNew = new JSCL.UI.Button("bNew", szulo, {caption:"Új", style_width:"55px", style_marginRight:"5px"});
                      this.bNew.view.style.cssText = this.bNew.view.style.cssText + ';display: inline-block;';
                      this.bNew.view.gazda = this;
                      this.bNew.view.onclick = function(){
                         this.gazda.bCancel.view.LastRow = this.gazda.grid.getSelectedRow();
                         this.gazda.grid.clearSelection()
                         this.gazda.formTilt(false);
                         this.gazda.tiltMind(true);
 //                      this.gazda.bCancel.view.disabled = false;
                         if(this.gazda.fgi.windowType == '14') {
                        	 if (this.gazda.fgi.new7Event){
                        		 if(this.gazda.fgi.newScript64) {
                        			 var fgi = this.gazda.fgi;
                        			 eval(decode64(this.gazda.fgi.newScript64));
                        		 } 
                        		 this.gazda.fgi.new7Event();
                        	 }
                         }
                         if(this.gazda.fgi.windowType == '15') {
                        	 if (this.gazda.fgi.new15Event){
                        		 if(this.gazda.fgi.newScript64) {
                        			 var fgi = this.gazda.fgi;
                        			 eval(decode64(this.gazda.fgi.newScript64));
                        		 } 
                        		 this.gazda.fgi.new15Event();
                        	 }
                         }
                      }
					  /*this.bUpdate = new JSCL.UI.Button("bUpdate", szulo, {caption:"Módosítás", style_width:"65px", style_marginRight:"5px"});
					  this.bUpdate.view.style.cssText = this.bUpdate.view.style.cssText + ';display: inline-block;';
                      this.bUpdate.view.gazda = this;
                      this.bUpdate.view.onclick = function(){
	                     this.gazda.bCancel.view.LastRow = this.gazda.grid.getSelectedRow();                                                 
	                     this.gazda.formTilt(false);
	                     this.gazda.tiltMind(true);
    //                   this.gazda.bCancel.view.disabled = false;
                         if (this.gazda.fgi.onUpdate){
                           this.gazda.fgi.onUpdate();
                         }
                       }   */                                            
                      this.bDel = new JSCL.UI.Button("bDel", szulo, {caption:"Törlés", style_width:"55px", style_marginRight:"5px"});
                      this.bDel.view.style.cssText = this.bDel.view.style.cssText + ';display: inline-block;';
                      this.bDel.view.gazda = this;                         
                      this.bDel.view.onclick = function(){
	                    if (this.gazda.fgi.delete7Event){
	                       this.gazda.fgi.delete7Event();
	                    }
	                  }
                      this.bSave = new JSCL.UI.Button("bSave", szulo, {caption:"Mentés", style_width:"55px", style_marginRight:"5px"});
                      this.bSave.view.style.cssText = this.bSave.view.style.cssText + ';display: inline-block;';
                      this.bSave.view.gazda = this;
                      this.bSave.view.onclick = function(){
                    	  if(this.gazda.fgi.windowType == '14') {
                    		  if(this.gazda.fgi.save7Event){
                    			  if(confirm("Biztos menti a változásokat?")){
                    				  if(this.gazda.fgi.beforeSaveScript64) {
                    					  var fgi = this.gazda.fgi;
                    					  eval(decode64(this.gazda.fgi.beforeSaveScript64));
                    				  }
                    				  this.gazda.fgi.save7Event();
                    			  }
                    		  }
                    	  }
                    	  if(this.gazda.fgi.windowType == '15') {
                    		  if(this.gazda.fgi.save15Event){
                    			  if(confirm("Biztos menti a változásokat?")){
                    				  if(this.gazda.fgi.beforeSaveScript64) {
                    					  var fgi = this.gazda.fgi;
                    					  eval(decode64(this.gazda.fgi.beforeSaveScript64));
                    				  }
                    				  this.gazda.fgi.save15Event();
                    			  }
                    		  }
                    	  }
	                      this.gazda.tiltMind(false);
	                      this.gazda.formTilt(true);
		  //           this.gazda.bCancel.view.disabled = true;
		                }
                      this.bCancel = new JSCL.UI.Button("bCancel", szulo, {caption:"Mégsem", style_width:"55px", style_marginRight:"5px"});
                      this.bCancel.view.style.cssText = this.bCancel.view.style.cssText + ';display: inline-block;';
//                      this.bCancel.view.disabled = true;
                      this.bCancel.view.gazda = this;
                      this.bCancel.view.lastRow = -1;
                      this.bCancel.view.onclick = function(){																										
                        if (this.gazda.fgi.cancel7Event){
                          if(confirm("Biztos elveti a módosításokat?")){
                          	this.gazda.fgi.cancel7Event();
                          }
                        }
                        this.gazda.tiltMind(false);
                        this.gazda.formTilt(true);
                        if (this.gazda.bCancel.view.LastRow != -1 ){
                        	this.gazda.grid.selectRow(this.gazda.bCancel.view.LastRow, false);
                          }
						this.gazda.bCancel.view.LastRow = -1	
// this.gazda.bCancel.view.disabled = true;
                      }
                     this.MozgatTilt(); 
                     this.formTilt(true);
                     this.tiltMind(false);
                    }
                    publ.id;                  
                    publ.grid;
                    publ.onPost;
                    publ.onNew;
                    publ.onUpdate;
                    publ.onDel;
                    publ.onCancel;
                    publ.onMoveFirst;
                    publ.onMoveNext;
                    publ.onMovePrev;
                    publ.onMoveLast;
                    publ.objuid;
                    publ.fgi;
                    publ.MozgatTilt = function(){
                    	o = this;
                    	switch(this.grid.getSelectedRow()){
                    		case 0:
                    			o.bMoveFirst.view.disabled = true;
                    			o.bMovePrev.view.disabled = true;
                    			o.bMoveLast.view.disabled = false;
                    			o.bMoveNext.view.disabled = false;                    			
                    			break;
                    		case this.grid.getRowCount() - 1:
                    			o.bMoveFirst.view.disabled = !true;
                    			o.bMovePrev.view.disabled = !true;
                    			o.bMoveLast.view.disabled = !false;
                    			o.bMoveNext.view.disabled = !false;                    			
								break;
							default:
								o.bMoveFirst.view.disabled = false;
                    			o.bMovePrev.view.disabled = false;
                    			o.bMoveLast.view.disabled = false;
                    			o.bMoveNext.view.disabled = false;                    			
                    	}
                    }
                    
					publ.tiltMind = function(b){
						this.bMoveFirst.view.disabled = b;
             			this.bMovePrev.view.disabled = b;
             			this.bMoveLast.view.disabled = b;
             			this.bMoveNext.view.disabled = b;                    			
             			this.bDel.view.disabled = b;
             			this.bNew.view.disabled = b;
//             			this.bUpdate.view.disabled = b;
             			this.bSave.view.disabled = !b;
             			this.bCancel.view.disabled = !b;
					} 		
								
					publ.formTilt = function (b){
						if (this.oForm){
							var fields = this.oForm.getFields();
							var l = fields.length;
	                      var i;
	                      for (i = 0; i < l; i++) {
	                        var field = fields[i];
							field.view.disabled = b;                       
	                      }
                      }
					}
                   
                    publ.onFiltering = function() {                    
                    }
                    
                    publ.onReposition = function() {
                    	this.MozgatTilt();
                    }
                  }
                 )
  ;
;
JSCL.UI.DBNavigatorka =
  JSCL.Lang.Class("JSCL.UI.DBNavigatorka", JSCL.UI.Object,
                  function(publ, supr) {
                    publ.init = function(id, szulo, grid, form, fgi) {
                    	var self = this;
                      supr(this).init();
                      this.grid = grid;
                      this.oForm = form;
                      this.fgi = fgi;
                      grid.datasource.removeNavigators();
                      grid.datasource.addListener(this);
                      this.id = id;
                      this.objuid = _objuid++;
                      this.bMoveFirst = new JSCL.UI.Button("bFirst", szulo, {caption:"<<", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveFirst.view.style.cssText = this.bMoveFirst.view.style.cssText + ';display: inline-block;';
                      this.bMoveFirst.view.gazda = this;
                      this.bMoveFirst.view.onclick = function(){
                    	  this.gazda.grid.selectRow(0, false)
                      };
                      this.bMovePrev = new JSCL.UI.Button("bPrev", szulo, {caption:"<", style_width:"55px", style_marginRight:"5px"});
                      this.bMovePrev.view.style.cssText = this.bMovePrev.view.style.cssText + ';display: inline-block;';
                      this.bMovePrev.view.gazda = this;
                      this.bMovePrev.view.onclick = function(){
						if (this.gazda.grid.getSelectedRow() != 0){
							this.gazda.grid.selectRow(this.gazda.grid.getSelectedRow() - 1 , false);
					  };
                      															};
                      this.bMoveNext = new JSCL.UI.Button("bNext", szulo, {caption:">", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveNext.view.style.cssText = this.bMoveNext.view.style.cssText + ';display: inline-block;';
                      this.bMoveNext.view.gazda = this;
                      this.bMoveNext.view.onclick = function(){
						if (this.gazda.grid.getSelectedRow() != this.gazda.grid.getRowCount() - 1){
						  this.gazda.grid.selectRow(this.gazda.grid.getSelectedRow() + 1 , false);
						};
					  };
                      this.bMoveLast = new JSCL.UI.Button("bLast", szulo, {caption:">>", style_width:"55px", style_marginRight:"5px"});
                      this.bMoveLast.view.style.cssText = this.bMoveLast.view.style.cssText + ';display: inline-block;';
                      this.bMoveLast.view.gazda = this;
                      this.bMoveLast.view.onclick = function(){
						this.gazda.grid.selectRow(this.gazda.grid.getRowCount() - 1, false)
					  };
                      
                      //*****************************

                     this.MozgatTilt(); 
                     this.formTilt(true);
                     this.tiltMind(false);
                    }
                    publ.id;                  
                    publ.grid;
                    publ.onMoveFirst;
                    publ.onMoveNext;
                    publ.onMovePrev;
                    publ.onMoveLast;
                    publ.objuid;
                    publ.fgi;
                    publ.MozgatTilt = function(){
                    	o = this;
                    	switch(this.grid.getSelectedRow()){
                    		case 0:
                    			o.bMoveFirst.view.disabled = true;
                    			o.bMovePrev.view.disabled = true;
                    			o.bMoveLast.view.disabled = false;
                    			o.bMoveNext.view.disabled = false;                    			
                    			break;
                    		case this.grid.getRowCount() - 1:
                    			o.bMoveFirst.view.disabled = !true;
                    			o.bMovePrev.view.disabled = !true;
                    			o.bMoveLast.view.disabled = !false;
                    			o.bMoveNext.view.disabled = !false;                    			
								break;
							default:
								o.bMoveFirst.view.disabled = false;
                    			o.bMovePrev.view.disabled = false;
                    			o.bMoveLast.view.disabled = false;
                    			o.bMoveNext.view.disabled = false;                    			
                    	}
                    }
                    
					publ.tiltMind = function(b){
						this.bMoveFirst.view.disabled = b;
             			this.bMovePrev.view.disabled = b;
             			this.bMoveLast.view.disabled = b;
             			this.bMoveNext.view.disabled = b;                    			
					} 		
								
					publ.formTilt = function (b){
						if (this.oForm){
							var fields = this.oForm.getFields();
							var l = fields.length;
	                      var i;
	                      for (i = 0; i < l; i++) {
	                        var field = fields[i];
							field.view.disabled = b;                       
	                      }
                      }
										}
                   
                    publ.onFiltering = function() {                    
                    }
                    
                    publ.onReposition = function() {
                    	this.MozgatTilt();
                    }
                  }
                 )
  ;
;
JSCL.UI.Clock =
  JSCL.Lang.Class("JSCL.UI.Clock", JSCL.UI.Component,
                  function(publ, supr) {
                    var self = this;
                  	var clockTarget = null;
                    publ.init = function(id, szulo, f) {
                      this.id = id;
                      this.calcParent(szulo);
                      clockTarget = this.parent;
                    }
										publ.timerID = null;
										publ.timerRunning = false;
										publ.stopclock = function (){
							        if (this.timerRunning) {
							          clearTimeout(this.timerID);
							        }
							        this.timerRunning = false;
										}
										publ.startclock = function() {
							        this.stopclock();
							        showtime();
										}
										function showtime() {
							        clockTarget.innerHTML = cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss");
							        self.timerID = setTimeout(showtime, 1000);
							        self.timerRunning = true;
										}
                  }
                 )
  ;
;
JSCL.UI.ClockPB = JSCL.Lang.Class("JSCL.UI.ClockPB", JSCL.UI.Component, function(
    publ, supr) {
  var self = this;
  var clockTarget = null;
  publ.init = function(id, szulo, f) {
    this.id = id;
    this.calcParent(szulo);
    clockTarget = this.parent;
    window.PageBus.subscribe("JSCL.UI.Clock.start", this,
        this.onStartMessage, null);
    window.PageBus.subscribe("JSCL.UI.Clock.stop", this,
        this.onStopMessage, null);
  }
  publ.timerID = null;
  publ.timerRunning = false;
  publ.stopclock = function() {
    if (this.timerRunning) {
      clearTimeout(this.timerID);
    }
    this.timerRunning = false;
  }
  publ.startclock = function() {
    this.stopclock();
    showtime();
  }
  publ.onStartMessage = function(subj, msg, data) {
    this.startclock();
  }
  publ.onStopMessage = function(subj, msg, data) {
    this.stopclock();
  }
  function showtime() {
    clockTarget.innerHTML = cnvDate(new Date(), "%yyyy.%mm.%dd %hh:%nn:%ss");
    self.timerID = setTimeout(showtime, 1000);
    self.timerRunning = true;
  }
});;
JSCL.UI.XIFrame =
  JSCL.Lang.Class("JSCL.UI.XIFrame", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.srcCallback = null;
                    publ.init = function(id, szulo, f, kotelezo) {
                      this.calcParent(szulo);
                      this.view = document.createElement("IFRAME");
                      this.view.name = id;
                      this.view.id = id;
                      this.parent.appendChild(this.view);
                      this.view.jsObject = this;
                      this.callbackSrc = new Function ("azon", f.src||"return (azon)");
                      supr(this).init(id, f, kotelezo);
                    }
                   publ.onReposition = function() {
                      try {
                        this.view.src = this.callbackSrc(this.datasource.getField(this.view.field));
                      } catch (e) {
                        // this.view.value = (this.defval == 'undefined' ? '' : this.defval);
                      }
                    }
                    publ.getValue = function() {
                      return (this.view.src);
                    }
                  }
                 )
  ;
;
JSCL.UI.FileUpload = JSCL.Lang.Class("JSCL.UI.FileUpload", JSCL.UI.DBComponent,
    function(publ, supr) {
      var self = publ;
      publ.formAzon = null;
      publ.frameAzon = null;
      publ.idAzon = null;
      publ.nevAzon = null;
      publ.bUpload = null;
      publ.init = function(id, szulo, f, kotelezo) {
        this.calcParent(szulo);
        var embDiv = document.createElement("SPAN");
        embDiv.className = "addedTexts";
        this.parent.appendChild(embDiv);
        this.formAzon = id + "Form";
        this.frameAzon = id + "Frame";
        this.idAzon = f.idfield;
        this.nevAzon = f.namefield;
        var frmUpload = document.createElement("FORM");
        frmUpload.name = this.formAzon;
        frmUpload.id = this.formAzon;
        frmUpload.encoding = "multipart/form-data";
        frmUpload.method = "post";
        frmUpload.target = this.frameAzon;
        frmUpload.action = "Command";
        frmUpload.inProgress = false;
        embDiv.appendChild(frmUpload);
        var hiddenCmd = document.createElement("INPUT");
        hiddenCmd.type = "hidden";
        hiddenCmd.name = "cmd";
        hiddenCmd.id = "cmd";
        hiddenCmd.value = "FileUploadXml";
        frmUpload.appendChild(hiddenCmd);
        var hiddenFileProvId = document.createElement("INPUT");
        hiddenFileProvId.type = "hidden";
        hiddenFileProvId.name = "fileProvId";
        hiddenFileProvId.id = "fileProvId";
        hiddenFileProvId.value = f.fileProvId;
        frmUpload.appendChild(hiddenFileProvId);
        this.view = document.createElement("INPUT");
        this.view.type = "file";
        if(f.condFailMessage) {
        	this.condFailMessage = f.condFailMessage;
        }
        if(f.uploadCondition) {
        	this.uploadCondition = new Function(decode64(f.uploadCondition));
        }
        frmUpload.appendChild(this.view);
        this.view.jsObject = this;
        this.bUpload = new JSCL.UI.Button(id + "Upload", embDiv, {
              id : id + "Upload",
              caption : "Feltölt",
              style_width : "55px"
            }, '');
        this.bUpload.view.gazda = this;
        this.bUpload.view.onclick.Add(function(src, ea) {
        	    src.disabled = true;
        	  if(src.gazda.uploadCondition != null) {
        		  if(src.gazda.uploadCondition()) {
        			  src.gazda.uploadEvent();
        		  } else {
        			  window.alert(src.gazda.condFailMessage);
        		  }
        	  } else {
        		  src.gazda.uploadEvent();
        	  }
            });

        supr(this).init(id, f, kotelezo);
        this.view.name = "txtFile";
        this.view.id = "txtFile";
      }
      publ.uploadCondition = null;
      publ.condFailMessage = "A feltöltés követelményei nem teljesülnek!";
      publ.onReposition = function() {

      }
      publ.onNecessity = function() {
		  /*var isblob = /.*BlobUpload$/g;
		  if(isblob.test(this.id)) {
			  if(this.uploadCondition != null) {
	    		  if(this.uploadCondition()) {
	    			  this.uploadEvent();
	    		  } else {
	    			  window.alert(this.condFailMessage);
	    		  }
	    	  } else {
	    		  this.uploadEvent();
	    	  }
	        }*/
      }
      publ.getValue = function() {
        return (this.view.value);
      }
      publ.dataRefresh = function(e) {
     		e = e || window.event;
      	elem = e.target || e.srcElement;
        var self = elem.gazda;
        var frame = document.getElementById(self.frameAzon);
        var r = { // bogus response object
          responseText : '',
          responseXML : null
        };
        try { //
          var doc;
          if (msie) {
            doc = frame.contentWindow.document;
          } else {
            doc = (frame.contentDocument || window.frames[self.frameAzon].document);
          }
          if (doc && doc.body) {
            r.responseText = doc.body.innerHTML;
          }
          if (doc && doc.XMLDocument) {
            r.responseXML = doc.XMLDocument;
          } else {
            r.responseXML = doc;
          }
        } catch (e) {
          alert(e);
        }
        var dbResp = new JSCL.Database.Database();
        dbResp.setData(dbResp.SOURCETYPE.TEXT,
            getXmlAsString(r.responseXML));
        var dsResp = new JSCL.Database.Datasource("FileUpload", dbResp);
        dsResp.name = "Row";
        var errResp = new JSCL.Database.Errors(dbResp);
        dbResp.retrieveData();
        if (errResp.isError()) {
          var errC = errResp.getCount();
          for (var i = 1; i <= errC; i++) {
            errResp.setPosition(i);
            alert(errResp.getCode() + '-' + errResp.getMessage());
          }
        } else {
          dsResp.goToFirst();
          var idElem = document.getElementById(self.idAzon);
          idElem.value = dsResp.getField('Id');
          var nevElem = document.getElementById(self.nevAzon);
          if(nevElem != null) {
        	  nevElem.value = dsResp.getField('Nev');
          }
        }
        self.bUpload.view.disabled = false;
        frame.parentNode.removeChild(frame);
      }

      publ.uploadEvent = function() {
        if (this.getValue() != '') {
          var SSL_SECURE_URL = "javascript:false";
          var frame = document.createElement('iframe');
          frame.id = this.frameAzon;
          frame.name = this.frameAzon;
          frame.className = 'x-hidden';
          frame.height = "0";
          frame.width = "0";
          frame.frameBorder = "0";
          frame.scrolling = "yes";
          if (msie) {
            frame.src = SSL_SECURE_URL;
          }
          document.body.appendChild(frame);
          if (msie) {
            document.frames[this.frameAzon].name = this.frameAzon;
          }
          frame.gazda = this;
          addE(frame, 'load', this.dataRefresh);
          // frame.onload = (new JSCL.Events.Listener()).Invoke;
          // frame.onload.Add(function(src, ea) {
          // alert("ssss");
          // src.gazda.dataRefresh();
          // });
          var formUL = document.getElementById(this.formAzon);
          formUL.submit();
        } else {
          alert('Nincs kiválasztva fájl a feltöltéshez.');
        }
      }

    });;
JSCL.UI.FileUploadNeat = JSCL.Lang.Class("JSCL.UI.FileUploadNeat", JSCL.UI.DBComponent,
    function(publ, supr) {
      var self = publ;
      publ.formAzon = null;
      publ.frameAzon = null;
      publ.idAzon = null;
      publ.nevAzon = null;
      publ.bUpload = null;
      publ.init = function(id, szulo, f, kotelezo) {
        this.calcParent(szulo);
        
        var embDiv = document.createElement("INPUT");
        embDiv.type="hidden";
        this.view = embDiv;
        this.view.value='';
        
        var w = document.createElement("DIV");
        
        //embDiv.className = "addedTexts";
        this.parent.appendChild(embDiv);
        this.parent.appendChild(w);
        this.formAzon = id + "Form";
        this.frameAzon = id + "Frame";
        this.idAzon = f.idfield;
        this.nevAzon = f.namefield;
        
        if(f.condFailMessage) {
        	this.condFailMessage = f.condFailMessage;
        }
        if(f.uploadCondition) {
        	this.uploadCondition = new Function(decode64(f.uploadCondition));
        }
        
        var uploader = new qq.FileUploader({
            element: w,
            action: 'Command',
            params: { cmd: 'FileUploadXml', fileProvId: f.fileProvId, fieldName: this.idAzon},
            idAzon: f.idfield,
            nevAzon: f.namefield,
            multiple: false,
            condFailMessage: f.condFailMessage ? f.condFailMessage : 'A feltöltés feltetele nem teljesul',
            uploadCondition: f.uploadCondition ? new Function(decode64(f.uploadCondition)) : null,
            debug: true
        });    
        
        /*uploader._options.idAzon = f.idfield;
        uploader._options.nevAzon = f.namefield;*/

        supr(this).init(id, f, kotelezo);

      }
      publ.uploadCondition = null;
      publ.condFailMessage = "A feltöltés követelményei nem teljesülnek!";
      publ.onReposition = function() {

      }
      publ.onNecessity = function() {
      }
      
      publ.getValue = function() {
        return (this.view.value);
      }
      publ.dataRefresh = function(e) {
     		e = e || window.event;
      	elem = e.target || e.srcElement;
        var self = elem.gazda;
        var frame = document.getElementById(self.frameAzon);
        var r = { // bogus response object
          responseText : '',
          responseXML : null
        };
        try { //
          var doc;
          if (msie) {
            doc = frame.contentWindow.document;
          } else {
            doc = (frame.contentDocument || window.frames[self.frameAzon].document);
          }
          if (doc && doc.body) {
            r.responseText = doc.body.innerHTML;
          }
          if (doc && doc.XMLDocument) {
            r.responseXML = doc.XMLDocument;
          } else {
            r.responseXML = doc;
          }
        } catch (e) {
          alert(e);
        }
        var dbResp = new JSCL.Database.Database();
        dbResp.setData(dbResp.SOURCETYPE.TEXT,
            getXmlAsString(r.responseXML));
        var dsResp = new JSCL.Database.Datasource("FileUpload", dbResp);
        dsResp.name = "Row";
        var errResp = new JSCL.Database.Errors(dbResp);
        dbResp.retrieveData();
        if (errResp.isError()) {
          var errC = errResp.getCount();
          for (var i = 1; i <= errC; i++) {
            errResp.setPosition(i);
            alert(errResp.getCode() + '-' + errResp.getMessage());
          }
        } else {
          dsResp.goToFirst();
          var idElem = document.getElementById(this._options.idAzon);
          idElem.value = dsResp.getField('Id');
          var nevElem = document.getElementById(this._options.nevAzon);
          if(nevElem != null) {
        	  nevElem.value = dsResp.getField('Nev');
          }
        }
        
        frame.parentNode.removeChild(frame);
      }

      publ.uploadEvent = function() {
        if (this.getValue() != '') {
          var SSL_SECURE_URL = "javascript:false";
          var frame = document.createElement('iframe');
          frame.id = this.frameAzon;
          frame.name = this.frameAzon;
          frame.className = 'x-hidden';
          frame.height = "0";
          frame.width = "0";
          frame.frameBorder = "0";
          frame.scrolling = "yes";
          if (msie) {
            frame.src = SSL_SECURE_URL;
          }
          document.body.appendChild(frame);
          if (msie) {
            document.frames[this.frameAzon].name = this.frameAzon;
          }
          frame.gazda = this;
          addE(frame, 'load', this.dataRefresh);
          // frame.onload = (new JSCL.Events.Listener()).Invoke;
          // frame.onload.Add(function(src, ea) {
          // alert("ssss");
          // src.gazda.dataRefresh();
          // });
          var formUL = document.getElementById(this.formAzon);
          formUL.submit();
          alert('A feltoltés sikerült');
          //
        } else {
          alert('Nincs kiválasztva fájl a feltöltéshez.');
        }
      }

    });;

    
    
    /**
     * http://github.com/valums/file-uploader
     * 
     * Multiple file upload component with progress-bar, drag-and-drop. 
     * Š 2010 Andrew Valums ( andrew(at)valums.com ) 
     * 
     * Licensed under GNU GPL 2 or later and GNU LGPL 2 or later, see license.txt.
     */    

    //
    // Helper functions
    //

    var qq = qq || {};

    /**
     * Adds all missing properties from second obj to first obj
     */ 
    qq.extend = function(first, second){
        for (var prop in second){
            first[prop] = second[prop];
        }
    };  

    /**
     * Searches for a given element in the array, returns -1 if it is not present.
     * @param {Number} [from] The index at which to begin the search
     */
    qq.indexOf = function(arr, elt, from){
        if (arr.indexOf) return arr.indexOf(elt, from);
        
        from = from || 0;
        var len = arr.length;    
        
        if (from < 0) from += len;  

        for (; from < len; from++){  
            if (from in arr && arr[from] === elt){  
                return from;
            }
        }  
        return -1;  
    }; 
        
    qq.getUniqueId = (function(){
        var id = 0;
        return function(){ return id++; };
    })();

    //
    // Events

    qq.attach = function(element, type, fn){
        if (element.addEventListener){
            element.addEventListener(type, fn, false);
        } else if (element.attachEvent){
            element.attachEvent('on' + type, fn);
        }
    };
    qq.detach = function(element, type, fn){
        if (element.removeEventListener){
            element.removeEventListener(type, fn, false);
        } else if (element.attachEvent){
            element.detachEvent('on' + type, fn);
        }
    };

    qq.preventDefault = function(e){
        if (e.preventDefault){
            e.preventDefault();
        } else{
            e.returnValue = false;
        }
    };

    //
    // Node manipulations

    /**
     * Insert node a before node b.
     */
    qq.insertBefore = function(a, b){
        b.parentNode.insertBefore(a, b);
    };
    qq.remove = function(element){
        element.parentNode.removeChild(element);
    };

    qq.contains = function(parent, descendant){       
        // compareposition returns false in this case
        if (parent == descendant) return true;
        
        if (parent.contains){
            return parent.contains(descendant);
        } else {
            return !!(descendant.compareDocumentPosition(parent) & 8);
        }
    };

    /**
     * Creates and returns element from html string
     * Uses innerHTML to create an element
     */
    qq.toElement = (function(){
        var div = document.createElement('div');
        return function(html){
            div.innerHTML = html;
            var element = div.firstChild;
            div.removeChild(element);
            return element;
        };
    })();

    //
    // Node properties and attributes

    /**
     * Sets styles for an element.
     * Fixes opacity in IE6-8.
     */
    qq.css = function(element, styles){
        if (styles.opacity != null){
            if (typeof element.style.opacity != 'string' && typeof(element.filters) != 'undefined'){
                styles.filter = 'alpha(opacity=' + Math.round(100 * styles.opacity) + ')';
            }
        }
        qq.extend(element.style, styles);
    };
    qq.hasClass = function(element, name){
        var re = new RegExp('(^| )' + name + '( |$)');
        return re.test(element.className);
    };
    qq.addClass = function(element, name){
        if (!qq.hasClass(element, name)){
            element.className += ' ' + name;
        }
    };
    qq.removeClass = function(element, name){
        var re = new RegExp('(^| )' + name + '( |$)');
        element.className = element.className.replace(re, ' ').replace(/^\s+|\s+$/g, "");
    };
    qq.setText = function(element, text){
        element.innerText = text;
        element.textContent = text;
    };

    //
    // Selecting elements

    qq.children = function(element){
        var children = [],
        child = element.firstChild;

        while (child){
            if (child.nodeType == 1){
                children.push(child);
            }
            child = child.nextSibling;
        }

        return children;
    };

    qq.getByClass = function(element, className){
        if (element.querySelectorAll){
            return element.querySelectorAll('.' + className);
        }

        var result = [];
        var candidates = element.getElementsByTagName("*");
        var len = candidates.length;

        for (var i = 0; i < len; i++){
            if (qq.hasClass(candidates[i], className)){
                result.push(candidates[i]);
            }
        }
        return result;
    };

    /**
     * obj2url() takes a json-object as argument and generates
     * a querystring. pretty much like jQuery.param()
     * 
     * how to use:
     *
     *    `qq.obj2url({a:'b',c:'d'},'http://any.url/upload?otherParam=value');`
     *
     * will result in:
     *
     *    `http://any.url/upload?otherParam=value&a=b&c=d`
     *
     * @param  Object JSON-Object
     * @param  String current querystring-part
     * @return String encoded querystring
     */
    qq.obj2url = function(obj, temp, prefixDone){
        var uristrings = [],
            prefix = '&',
            add = function(nextObj, i){
                var nextTemp = temp 
                    ? (/\[\]$/.test(temp)) // prevent double-encoding
                       ? temp
                       : temp+'['+i+']'
                    : i;
                if ((nextTemp != 'undefined') && (i != 'undefined')) {  
                    uristrings.push(
                        (typeof nextObj === 'object') 
                            ? qq.obj2url(nextObj, nextTemp, true)
                            : (Object.prototype.toString.call(nextObj) === '[object Function]')
                                ? encodeURIComponent(nextTemp) + '=' + encodeURIComponent(nextObj())
                                : encodeURIComponent(nextTemp) + '=' + encodeURIComponent(nextObj)                                                          
                    );
                }
            }; 

        if (!prefixDone && temp) {
          prefix = (/\?/.test(temp)) ? (/\?$/.test(temp)) ? '' : '&' : '?';
          uristrings.push(temp);
          uristrings.push(qq.obj2url(obj));
        } else if ((Object.prototype.toString.call(obj) === '[object Array]') && (typeof obj != 'undefined') ) {
            // we wont use a for-in-loop on an array (performance)
            for (var i = 0, len = obj.length; i < len; ++i){
                add(obj[i], i);
            }
        } else if ((typeof obj != 'undefined') && (obj !== null) && (typeof obj === "object")){
            // for anything else but a scalar, we will use for-in-loop
            for (var i in obj){
                add(obj[i], i);
            }
        } else {
            uristrings.push(encodeURIComponent(temp) + '=' + encodeURIComponent(obj));
        }

        return uristrings.join(prefix)
                         .replace(/^&/, '')
                         .replace(/%20/g, '+'); 
    };

    //
    //
    // Uploader Classes
    //
    //

    var qq = qq || {};
        
    /**
     * Creates upload button, validates upload, but doesn't create file list or dd. 
     */
    qq.FileUploaderBasic = function(o){
        this._options = {
            // set to true to see the server response
            debug: false,
            action: '/server/upload',
            params: {},
            button: null,
            multiple: false,
            maxConnections: 3,
            // validation        
            allowedExtensions: [],               
            sizeLimit: 0,   
            minSizeLimit: 0,                             
            // events
            // return false to cancel submit
            onSubmit: function(id, fileName){
              if(this.uploadCondition) {
           		  if(this.uploadCondition()) {
           			  return true;
           		  } else {
           			  window.alert(this.condFailMessage);
           			  return false;
           		  }
           	  } else {
           		  return true;
           	  }
            },
            onProgress: function(id, fileName, loaded, total){},
            onComplete: function(id, fileName, responseJSON){

            	var dbResp = new JSCL.Database.Database();
                dbResp.setData(dbResp.SOURCETYPE.TEXT, responseJSON.xml);
                var dsResp = new JSCL.Database.Datasource("FileUpload", dbResp);
                dsResp.name = "Row";
                var errResp = new JSCL.Database.Errors(dbResp);
                dbResp.retrieveData();
                if (errResp.isError()) {
                  var errC = errResp.getCount();
                  for (var i = 1; i <= errC; i++) {
                    errResp.setPosition(i);
                    alert(errResp.getCode() + '-' + errResp.getMessage());
                  }
                } else {
                  dsResp.goToFirst();
                  var idElem = document.getElementById(this.idAzon);
                  idElem.value = dsResp.getField('Id');
                  var nevElem = document.getElementById(this.nevAzon);
                  if(nevElem != null) {
                	  nevElem.value = dsResp.getField('Nev');
                  }
                }
            },
            onCancel: function(id, fileName){},
            // messages                
            messages: {
                typeError: "{file} has invalid extension. Only {extensions} are allowed.",
                sizeError: "{file} is too large, maximum file size is {sizeLimit}.",
                minSizeError: "{file} is too small, minimum file size is {minSizeLimit}.",
                emptyError: "{file} is empty, please select files again without it.",
                onLeave: "The files are being uploaded, if you leave now the upload will be cancelled."            
            },
            showMessage: function(message){
                alert(message);
            }               
        };
        qq.extend(this._options, o);
            
        // number of files being uploaded
        this._filesInProgress = 0;
        this._handler = this._createUploadHandler(); 
        
        if (this._options.button){ 
            this._button = this._createUploadButton(this._options.button);
        }
                            
        //this._preventLeaveInProgress();         
    };
       
    qq.FileUploaderBasic.prototype = {
        setParams: function(params){
            this._options.params = params;
        },
        getInProgress: function(){
            return this._filesInProgress;         
        },
        _createUploadButton: function(element){
            var self = this;
            
            return new qq.UploadButton({
                element: element,
                multiple: this._options.multiple && qq.UploadHandlerXhr.isSupported(),
                onChange: function(input){
                    self._onInputChange(input);
                }        
            });           
        },    
        _createUploadHandler: function(){
            var self = this,
                handlerClass;        
            
            if(qq.UploadHandlerXhr.isSupported()){           
                handlerClass = 'UploadHandlerXhr';                        
            } else {
                handlerClass = 'UploadHandlerForm';
            }

            var handler = new qq[handlerClass]({
                debug: this._options.debug,
                action: this._options.action,         
                maxConnections: this._options.maxConnections,   
                onProgress: function(id, fileName, loaded, total){                
                    self._onProgress(id, fileName, loaded, total);
                    self._options.onProgress(id, fileName, loaded, total);                    
                },            
                onComplete: function(id, fileName, result){
                    self._onComplete(id, fileName, result);
                    self._options.onComplete(id, fileName, result);
                },
                onCancel: function(id, fileName){
                    self._onCancel(id, fileName);
                    self._options.onCancel(id, fileName);
                }
            });

            return handler;
        },    
        _preventLeaveInProgress: function(){
            var self = this;
            
            qq.attach(window, 'beforeunload', function(e){
                if (!self._filesInProgress){return;}
                
                var e = e || window.event;
                // for ie, ff
                e.returnValue = self._options.messages.onLeave;
                // for webkit
                return self._options.messages.onLeave;             
            });        
        },    
        _onSubmit: function(id, fileName){
            this._filesInProgress++;  
        },
        _onProgress: function(id, fileName, loaded, total){        
        },
        _onComplete: function(id, fileName, result){
            this._filesInProgress--;                 
            if (result.error){
                this._options.showMessage(result.error);
            }             
        },
        _onCancel: function(id, fileName){
            this._filesInProgress--;        
        },
        _onInputChange: function(input){
            if (this._handler instanceof qq.UploadHandlerXhr){                
                this._uploadFileList(input.files);                   
            } else {             
                if (this._validateFile(input)){                
                    this._uploadFile(input);                                    
                }                      
            }               
            this._button.reset();   
        },  
        _uploadFileList: function(files){
            for (var i=0; i<files.length; i++){
                if ( !this._validateFile(files[i])){
                    return;
                }            
            }
            
            for (var i=0; i<files.length; i++){
                this._uploadFile(files[i]);        
            }        
        },       
        _uploadFile: function(fileContainer){      
            var id = this._handler.add(fileContainer);
            var fileName = this._handler.getName(id);
            
            if (this._options.onSubmit(id, fileName) !== false){
                this._onSubmit(id, fileName);
                this._handler.upload(id, this._options.params);
            }
        },      
        _validateFile: function(file){
            var name, size;
            
            if (file.value){
                // it is a file input            
                // get input value and remove path to normalize
                name = file.value.replace(/.*(\/|\\)/, "");
            } else {
                // fix missing properties in Safari
                name = file.fileName != null ? file.fileName : file.name;
                size = file.fileSize != null ? file.fileSize : file.size;
            }
                        
            if (! this._isAllowedExtension(name)){            
                this._error('typeError', name);
                return false;
                
            } else if (size === 0){            
                this._error('emptyError', name);
                return false;
                                                         
            } else if (size && this._options.sizeLimit && size > this._options.sizeLimit){            
                this._error('sizeError', name);
                return false;
                            
            } else if (size && size < this._options.minSizeLimit){
                this._error('minSizeError', name);
                return false;            
            }
            
            return true;                
        },
        _error: function(code, fileName){
            var message = this._options.messages[code];        
            function r(name, replacement){ message = message.replace(name, replacement); }
            
            r('{file}', this._formatFileName(fileName));        
            r('{extensions}', this._options.allowedExtensions.join(', '));
            r('{sizeLimit}', this._formatSize(this._options.sizeLimit));
            r('{minSizeLimit}', this._formatSize(this._options.minSizeLimit));
            
            this._options.showMessage(message);                
        },
        _formatFileName: function(name){
            if (name.length > 33){
                name = name.slice(0, 19) + '...' + name.slice(-13);    
            }
            return name;
        },
        _isAllowedExtension: function(fileName){
            var ext = (-1 !== fileName.indexOf('.')) ? fileName.replace(/.*[.]/, '').toLowerCase() : '';
            var allowed = this._options.allowedExtensions;
            
            if (!allowed.length){return true;}        
            
            for (var i=0; i<allowed.length; i++){
                if (allowed[i].toLowerCase() == ext){ return true;}    
            }
            
            return false;
        },    
        _formatSize: function(bytes){
            var i = -1;                                    
            do {
                bytes = bytes / 1024;
                i++;  
            } while (bytes > 99);
            
            return Math.max(bytes, 0.1).toFixed(1) + ['kB', 'MB', 'GB', 'TB', 'PB', 'EB'][i];          
        }
    };
        
           
    /**
     * Class that creates upload widget with drag-and-drop and file list
     * @inherits qq.FileUploaderBasic
     */
    qq.FileUploader = function(o){
        // call parent constructor
        qq.FileUploaderBasic.apply(this, arguments);
        
        // additional options    
        qq.extend(this._options, {
            element: null,
            // if set, will be used instead of qq-upload-list in template
            listElement: null,
                    
            template: '<div class="qq-uploader">' + 
                    '<div class="qq-upload-drop-area"><span>Húzz ide fájlokat a feltöltéshez</span></div>' +
                    '<div class="qq-upload-button">Tallózás</div>' +
                    '<ul class="qq-upload-list"></ul>' + 
                 '</div>',

            // template for one item in file list
            fileTemplate: '<li>' +
                    '<span class="qq-upload-file"></span>' +
                    '<span class="qq-upload-spinner"></span>' +
                    '<span class="qq-upload-size"></span>' +
                    '<a class="qq-upload-cancel" href="#">Megszakít</a>' +
                    '<span class="qq-upload-failed-text">Hiba</span>' +
                '</li>',        
            
            classes: {
                // used to get elements from templates
                button: 'qq-upload-button',
                drop: 'qq-upload-drop-area',
                dropActive: 'qq-upload-drop-area-active',
                list: 'qq-upload-list',
                            
                file: 'qq-upload-file',
                spinner: 'qq-upload-spinner',
                size: 'qq-upload-size',
                cancel: 'qq-upload-cancel',

                // added to list item when upload completes
                // used in css to hide progress spinner
                success: 'qq-upload-success',
                fail: 'qq-upload-fail'
            }
        });
        // overwrite options with user supplied    
        qq.extend(this._options, o);       

        this._element = this._options.element;
        this._element.innerHTML = this._options.template;        
        this._listElement = this._options.listElement || this._find(this._element, 'list');
        
        this._classes = this._options.classes;
            
        this._button = this._createUploadButton(this._find(this._element, 'button'));        
        
        this._bindCancelEvent();
        this._setupDragDrop();
    };

    // inherit from Basic Uploader
    qq.extend(qq.FileUploader.prototype, qq.FileUploaderBasic.prototype);

    qq.extend(qq.FileUploader.prototype, {
        /**
         * Gets one of the elements listed in this._options.classes
         **/
        _find: function(parent, type){                                
            var element = qq.getByClass(parent, this._options.classes[type])[0];        
            if (!element){
                throw new Error('element not found ' + type);
            }
            
            return element;
        },
        _setupDragDrop: function(){
            var self = this,
                dropArea = this._find(this._element, 'drop');                        

            var dz = new qq.UploadDropZone({
                element: dropArea,
                onEnter: function(e){
                    qq.addClass(dropArea, self._classes.dropActive);
                    e.stopPropagation();
                },
                onLeave: function(e){
                    e.stopPropagation();
                },
                onLeaveNotDescendants: function(e){
                    qq.removeClass(dropArea, self._classes.dropActive);  
                },
                onDrop: function(e){
                    dropArea.style.display = 'none';
                    qq.removeClass(dropArea, self._classes.dropActive);
                    self._uploadFileList(e.dataTransfer.files);    
                }
            });
                    
            dropArea.style.display = 'none';

            qq.attach(document, 'dragenter', function(e){     
                if (!dz._isValidFileDrag(e)) return; 
                
                dropArea.style.display = 'block';            
            });                 
            qq.attach(document, 'dragleave', function(e){
                if (!dz._isValidFileDrag(e)) return;            
                
                var relatedTarget = document.elementFromPoint(e.clientX, e.clientY);
                // only fire when leaving document out
                if ( ! relatedTarget || relatedTarget.nodeName == "HTML"){               
                    dropArea.style.display = 'none';                                            
                }
            });                
        },
        _onSubmit: function(id, fileName){
            qq.FileUploaderBasic.prototype._onSubmit.apply(this, arguments);
            this._addToList(id, fileName);  
        },
        _onProgress: function(id, fileName, loaded, total){
            qq.FileUploaderBasic.prototype._onProgress.apply(this, arguments);

            var item = this._getItemByFileId(id);
            var size = this._find(item, 'size');
            size.style.display = 'inline';
            
            var text; 
            if (loaded != total){
                text = Math.round(loaded / total * 100) + '% from ' + this._formatSize(total);
            } else {                                   
                text = this._formatSize(total);
            }          
            
            qq.setText(size, text);         
        },
        _onComplete: function(id, fileName, result){
            qq.FileUploaderBasic.prototype._onComplete.apply(this, arguments);

            // mark completed
            var item = this._getItemByFileId(id);                
            qq.remove(this._find(item, 'cancel'));
            qq.remove(this._find(item, 'spinner'));
            
            if (result.success){
                qq.addClass(item, this._classes.success);    
            } else {
                qq.addClass(item, this._classes.fail);
            }         
        },
        _addToList: function(id, fileName){
            var item = qq.toElement(this._options.fileTemplate);                
            item.qqFileId = id;

            var fileElement = this._find(item, 'file');        
            qq.setText(fileElement, this._formatFileName(fileName));
            this._find(item, 'size').style.display = 'none';        

            this._listElement.appendChild(item);
        },
        _getItemByFileId: function(id){
            var item = this._listElement.firstChild;        
            
            // there can't be txt nodes in dynamically created list
            // and we can  use nextSibling
            while (item){            
                if (item.qqFileId == id) return item;            
                item = item.nextSibling;
            }          
        },
        /**
         * delegate click event for cancel link 
         **/
        _bindCancelEvent: function(){
            var self = this,
                list = this._listElement;            
            
            qq.attach(list, 'click', function(e){            
                e = e || window.event;
                var target = e.target || e.srcElement;
                
                if (qq.hasClass(target, self._classes.cancel)){                
                    qq.preventDefault(e);
                   
                    var item = target.parentNode;
                    self._handler.cancel(item.qqFileId);
                    qq.remove(item);
                }
            });
        }    
    });
        
    qq.UploadDropZone = function(o){
        this._options = {
            element: null,  
            onEnter: function(e){},
            onLeave: function(e){},  
            // is not fired when leaving element by hovering descendants   
            onLeaveNotDescendants: function(e){},   
            onDrop: function(e){}                       
        };
        qq.extend(this._options, o); 
        
        this._element = this._options.element;
        
        this._disableDropOutside();
        this._attachEvents();   
    };

    qq.UploadDropZone.prototype = {
        _disableDropOutside: function(e){
            // run only once for all instances
            if (!qq.UploadDropZone.dropOutsideDisabled ){

                qq.attach(document, 'dragover', function(e){
                    if (e.dataTransfer){
                        e.dataTransfer.dropEffect = 'none';
                        e.preventDefault(); 
                    }           
                });
                
                qq.UploadDropZone.dropOutsideDisabled = true; 
            }        
        },
        _attachEvents: function(){
            var self = this;              
                      
            qq.attach(self._element, 'dragover', function(e){
                if (!self._isValidFileDrag(e)) return;
                
                var effect = e.dataTransfer.effectAllowed;
                if (effect == 'move' || effect == 'linkMove'){
                    e.dataTransfer.dropEffect = 'move'; // for FF (only move allowed)    
                } else {                    
                    e.dataTransfer.dropEffect = 'copy'; // for Chrome
                }
                                                         
                e.stopPropagation();
                e.preventDefault();                                                                    
            });
            
            qq.attach(self._element, 'dragenter', function(e){
                if (!self._isValidFileDrag(e)) return;
                            
                self._options.onEnter(e);
            });
            
            qq.attach(self._element, 'dragleave', function(e){
                if (!self._isValidFileDrag(e)) return;
                
                self._options.onLeave(e);
                
                var relatedTarget = document.elementFromPoint(e.clientX, e.clientY);                      
                // do not fire when moving a mouse over a descendant
                if (qq.contains(this, relatedTarget)) return;
                            
                self._options.onLeaveNotDescendants(e); 
            });
                    
            qq.attach(self._element, 'drop', function(e){
                if (!self._isValidFileDrag(e)) return;
                
                e.preventDefault();
                self._options.onDrop(e);
            });          
        },
        _isValidFileDrag: function(e){
            var dt = e.dataTransfer,
                // do not check dt.types.contains in webkit, because it crashes safari 4            
                isWebkit = navigator.userAgent.indexOf("AppleWebKit") > -1;                        

            // dt.effectAllowed is none in Safari 5
            // dt.types.contains check is for firefox            
            return dt && dt.effectAllowed != 'none' && 
                (dt.files || (!isWebkit && dt.types.contains && dt.types.contains('Files')));
            
        }        
    }; 

    qq.UploadButton = function(o){
        this._options = {
            element: null,  
            // if set to true adds multiple attribute to file input      
            multiple: false,
            // name attribute of file input
            name: 'file',
            onChange: function(input){},
            hoverClass: 'qq-upload-button-hover',
            focusClass: 'qq-upload-button-focus'                       
        };
        
        qq.extend(this._options, o);
            
        this._element = this._options.element;
        
        // make button suitable container for input
        qq.css(this._element, {
            position: 'relative',
            overflow: 'hidden',
            // Make sure browse button is in the right side
            // in Internet Explorer
            direction: 'ltr'
        });   
        
        this._input = this._createInput();
    };

    qq.UploadButton.prototype = {
        /* returns file input element */    
        getInput: function(){
            return this._input;
        },
        /* cleans/recreates the file input */
        reset: function(){
            if (this._input.parentNode){
                qq.remove(this._input);    
            }                
            
            qq.removeClass(this._element, this._options.focusClass);
            this._input = this._createInput();
        },    
        _createInput: function(){                
            var input = document.createElement("input");
            
            if (this._options.multiple){
                input.setAttribute("multiple", "multiple");
            }
                    
            input.setAttribute("type", "file");
            input.setAttribute("name", this._options.name);
            
            qq.css(input, {
                position: 'absolute',
                // in Opera only 'browse' button
                // is clickable and it is located at
                // the right side of the input
                right: 0,
                top: 0,
                fontFamily: 'Arial',
                // 4 persons reported this, the max values that worked for them were 243, 236, 236, 118
                fontSize: '118px',
                margin: 0,
                padding: 0,
                cursor: 'pointer',
                opacity: 0
            });
            
            this._element.appendChild(input);

            var self = this;
            qq.attach(input, 'change', function(){
                self._options.onChange(input);
            });
                    
            qq.attach(input, 'mouseover', function(){
                qq.addClass(self._element, self._options.hoverClass);
            });
            qq.attach(input, 'mouseout', function(){
                qq.removeClass(self._element, self._options.hoverClass);
            });
            qq.attach(input, 'focus', function(){
                qq.addClass(self._element, self._options.focusClass);
            });
            qq.attach(input, 'blur', function(){
                qq.removeClass(self._element, self._options.focusClass);
            });

            // IE and Opera, unfortunately have 2 tab stops on file input
            // which is unacceptable in our case, disable keyboard access
            if (window.attachEvent){
                // it is IE or Opera
                input.setAttribute('tabIndex', "-1");
            }

            return input;            
        }        
    };

    /**
     * Class for uploading files, uploading itself is handled by child classes
     */
    qq.UploadHandlerAbstract = function(o){
        this._options = {
            debug: false,
            action: '/upload.php',
            // maximum number of concurrent uploads        
            maxConnections: 999,
            onProgress: function(id, fileName, loaded, total){},
            onComplete: function(id, fileName, response){},
            onCancel: function(id, fileName){}
        };
        qq.extend(this._options, o);    
        
        this._queue = [];
        // params for files in queue
        this._params = [];
    };
    qq.UploadHandlerAbstract.prototype = {
        log: function(str){
            if (this._options.debug && window.console) console.log('[uploader] ' + str);        
        },
        /**
         * Adds file or file input to the queue
         * @returns id
         **/    
        add: function(file){},
        /**
         * Sends the file identified by id and additional query params to the server
         */
        upload: function(id, params){
            var len = this._queue.push(id);

            var copy = {};        
            qq.extend(copy, params);
            this._params[id] = copy;        
                    
            // if too many active uploads, wait...
            if (len <= this._options.maxConnections){               
                this._upload(id, this._params[id]);
            }
        },
        /**
         * Cancels file upload by id
         */
        cancel: function(id){
            this._cancel(id);
            this._dequeue(id);
        },
        /**
         * Cancells all uploads
         */
        cancelAll: function(){
            for (var i=0; i<this._queue.length; i++){
                this._cancel(this._queue[i]);
            }
            this._queue = [];
        },
        /**
         * Returns name of the file identified by id
         */
        getName: function(id){},
        /**
         * Returns size of the file identified by id
         */          
        getSize: function(id){},
        /**
         * Returns id of files being uploaded or
         * waiting for their turn
         */
        getQueue: function(){
            return this._queue;
        },
        /**
         * Actual upload method
         */
        _upload: function(id){},
        /**
         * Actual cancel method
         */
        _cancel: function(id){},     
        /**
         * Removes element from queue, starts upload of next
         */
        _dequeue: function(id){
            var i = qq.indexOf(this._queue, id);
            this._queue.splice(i, 1);
                    
            var max = this._options.maxConnections;
            
            if (this._queue.length >= max && i < max){
                var nextId = this._queue[max-1];
                this._upload(nextId, this._params[nextId]);
            }
        }        
    };

    /**
     * Class for uploading files using form and iframe
     * @inherits qq.UploadHandlerAbstract
     */
    qq.UploadHandlerForm = function(o){
        qq.UploadHandlerAbstract.apply(this, arguments);
           
        this._inputs = {};
    };
    // @inherits qq.UploadHandlerAbstract
    qq.extend(qq.UploadHandlerForm.prototype, qq.UploadHandlerAbstract.prototype);

    qq.extend(qq.UploadHandlerForm.prototype, {
        add: function(fileInput){
            fileInput.setAttribute('name', 'qqfile');
            var id = 'qq-upload-handler-iframe' + qq.getUniqueId();       
            
            this._inputs[id] = fileInput;
            
            // remove file input from DOM
            if (fileInput.parentNode){
                qq.remove(fileInput);
            }
                    
            return id;
        },
        getName: function(id){
            // get input value and remove path to normalize
            return this._inputs[id].value.replace(/.*(\/|\\)/, "");
        },    
        _cancel: function(id){
            this._options.onCancel(id, this.getName(id));
            
            delete this._inputs[id];        

            var iframe = document.getElementById(id);
            if (iframe){
                // to cancel request set src to something else
                // we use src="javascript:false;" because it doesn't
                // trigger ie6 prompt on https
                iframe.setAttribute('src', 'javascript:false;');

                qq.remove(iframe);
            }
        },     
        _upload: function(id, params){                        
            var input = this._inputs[id];
            
            if (!input){
                throw new Error('file with passed id was not added, or already uploaded or cancelled');
            }                

            var fileName = this.getName(id);
                    
            var iframe = this._createIframe(id);
            var form = this._createForm(iframe, params);
            form.appendChild(input);

            var self = this;
            this._attachLoadEvent(iframe, function(){                                 
                self.log('iframe loaded');
                
                var response = self._getIframeContentJSON(iframe);

                self._options.onComplete(id, fileName, response);
                self._dequeue(id);
                
                delete self._inputs[id];
                // timeout added to fix busy state in FF3.6
                setTimeout(function(){
                    qq.remove(iframe);
                }, 1);
            });

            form.submit();        
            qq.remove(form);        
            
            return id;
        }, 
        _attachLoadEvent: function(iframe, callback){
            qq.attach(iframe, 'load', function(){
                // when we remove iframe from dom
                // the request stops, but in IE load
                // event fires
                if (!iframe.parentNode){
                    return;
                }

                // fixing Opera 10.53
                if (iframe.contentDocument &&
                    iframe.contentDocument.body &&
                    iframe.contentDocument.body.innerHTML == "false"){
                    // In Opera event is fired second time
                    // when body.innerHTML changed from false
                    // to server response approx. after 1 sec
                    // when we upload file with iframe
                    return;
                }

                callback();
            });
        },
        /**
         * Returns json object received by iframe from server.
         */
        _getIframeContentJSON: function(iframe){
            // iframe.contentWindow.document - for IE<7
            var doc = iframe.contentDocument ? iframe.contentDocument: iframe.contentWindow.document,
                response;
            
            this.log("converting iframe's innerHTML to JSON");
            this.log("innerHTML = " + doc.body.innerHTML);
                            
            try {
                response = eval("(" + doc.body.innerHTML + ")");
            } catch(err){
                response = {};
            }        

            return response;
        },
        /**
         * Creates iframe with unique name
         */
        _createIframe: function(id){
            // We can't use following code as the name attribute
            // won't be properly registered in IE6, and new window
            // on form submit will open
            // var iframe = document.createElement('iframe');
            // iframe.setAttribute('name', id);

            var iframe = qq.toElement('<iframe src="javascript:false;" name="' + id + '" />');
            // src="javascript:false;" removes ie6 prompt on https

            iframe.setAttribute('id', id);

            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            return iframe;
        },
        /**
         * Creates form, that will be submitted to iframe
         */
        _createForm: function(iframe, params){
            // We can't use the following code in IE6
            // var form = document.createElement('form');
            // form.setAttribute('method', 'post');
            // form.setAttribute('enctype', 'multipart/form-data');
            // Because in this case file won't be attached to request
            var form = qq.toElement('<form method="post" enctype="multipart/form-data"></form>');

            /*var hiddenCmd = document.createElement("INPUT");
            hiddenCmd.type = "hidden";
            hiddenCmd.name = "cmd";
            hiddenCmd.id = "cmd";
            hiddenCmd.value = "FileUploadXml";
            frmUpload.appendChild(hiddenCmd);*/
            
            /*var hiddenFileProvId = document.createElement("INPUT");
            hiddenFileProvId.type = "hidden";
            hiddenFileProvId.name = "fileProvId";
            hiddenFileProvId.id = "fileProvId";
            hiddenFileProvId.value = f.fileProvId;
            frmUpload.appendChild(hiddenFileProvId);*/
            
            var queryString = qq.obj2url(params, this._options.action);

            form.setAttribute('action', queryString);
            form.setAttribute('target', iframe.name);
            form.style.display = 'none';
            document.body.appendChild(form);

            return form;
        }
    });

    /**
     * Class for uploading files using xhr
     * @inherits qq.UploadHandlerAbstract
     */
    qq.UploadHandlerXhr = function(o){
        qq.UploadHandlerAbstract.apply(this, arguments);

        this._files = [];
        this._xhrs = [];
        
        // current loaded size in bytes for each file 
        this._loaded = [];
    };

    // static method
    qq.UploadHandlerXhr.isSupported = function(){
        var input = document.createElement('input');
        input.type = 'file';        
        
        return (
            'multiple' in input &&
            typeof File != "undefined" &&
            typeof (new XMLHttpRequest()).upload != "undefined" );       
    };

    // @inherits qq.UploadHandlerAbstract
    qq.extend(qq.UploadHandlerXhr.prototype, qq.UploadHandlerAbstract.prototype)

    qq.extend(qq.UploadHandlerXhr.prototype, {
        /**
         * Adds file to the queue
         * Returns id to use with upload, cancel
         **/    
        add: function(file){
            if (!(file instanceof File)){
                throw new Error('Passed obj in not a File (in qq.UploadHandlerXhr)');
            }
                    
            return this._files.push(file) - 1;        
        },
        getName: function(id){        
            var file = this._files[id];
            // fix missing name in Safari 4
            return file.fileName != null ? file.fileName : file.name;       
        },
        getSize: function(id){
            var file = this._files[id];
            return file.fileSize != null ? file.fileSize : file.size;
        },    
        /**
         * Returns uploaded bytes for file identified by id 
         */    
        getLoaded: function(id){
            return this._loaded[id] || 0; 
        },
        /**
         * Sends the file identified by id and additional query params to the server
         * @param {Object} params name-value string pairs
         */    
        _upload: function(id, params){
            var file = this._files[id],
                name = this.getName(id),
                size = this.getSize(id);
                    
            this._loaded[id] = 0;
                                    
            var xhr = this._xhrs[id] = new XMLHttpRequest();
            var self = this;
                                            
            xhr.upload.onprogress = function(e){
                if (e.lengthComputable){
                    self._loaded[id] = e.loaded;
                    self._options.onProgress(id, name, e.loaded, e.total);
                }
            };

            xhr.onreadystatechange = function(){            
                if (xhr.readyState == 4){
                    self._onComplete(id, xhr);                    
                }
            };

            // build query string
            params = params || {};
            params['qqfile'] = name;
            var queryString = qq.obj2url(params, this._options.action);

            xhr.open("POST", queryString, true);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("X-File-Name", encodeURIComponent(name));
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.send(file);
        },
        _onComplete: function(id, xhr){
            // the request was aborted/cancelled
            if (!this._files[id]) return;
            
            var name = this.getName(id);
            var size = this.getSize(id);
            
            this._options.onProgress(id, name, size, size);
                    
            if (xhr.status == 200){
                this.log("xhr - server response received");
                this.log("responseText = " + xhr.responseText);
                            
                var response; 
                try {
                    response = eval("(" + xhr.responseText + ")");
                } catch(err){
                	response = {};
                	if(xhr.responseText.indexOf('success') > 0) {
                		response.success = true;
                		response.xml = xhr.responseText;
                	}
                }
                
                /*var dbResp = new JSCL.Database.Database();
                dbResp.setData(dbResp.SOURCETYPE.TEXT, xhr.responseText);
                var dsResp = new JSCL.Database.Datasource("FileUpload", dbResp);
                dsResp.name = "Row";
                var errResp = new JSCL.Database.Errors(dbResp);
                dbResp.retrieveData();
                if (errResp.isError()) {
                  var errC = errResp.getCount();
                  for (var i = 1; i <= errC; i++) {
                    errResp.setPosition(i);
                    alert(errResp.getCode() + '-' + errResp.getMessage());
                  }
                } else {
                  dsResp.goToFirst();
                  var idElem = document.getElementById(this._options.idAzon);
                  idElem.value = dsResp.getField('Id');
                  var nevElem = document.getElementById(this._options.nevAzon);
                  if(nevElem != null) {
                	  nevElem.value = dsResp.getField('Nev');
                  }
                }*/
                
                this._options.onComplete(id, name, response);
                            
            } else {                   
                this._options.onComplete(id, name, {});
            }
                    
            this._files[id] = null;
            this._xhrs[id] = null;    
            this._dequeue(id);                    
        },
        _cancel: function(id){
            this._options.onCancel(id, this.getName(id));
            
            this._files[id] = null;
            
            if (this._xhrs[id]){
                this._xhrs[id].abort();
                this._xhrs[id] = null;                                   
            }
        }
    });
JSCL.UI.Empty =
  JSCL.Lang.Class("JSCL.UI.Empty", JSCL.UI.Object,
                  function(publ, supr) {
                    publ.init = function(szulo, f) {
                      supr(this).init();
                      this.calcParent(szulo);
                      this.view = document.createElement("SPAN");
                      this.content = this.view;
                      this.parent.appendChild(this.view);
                    }
                  }
                 )
  ;
;
JSCL.Engine.xslObj = new JSCL.Net.Xsl();
JSCL.Engine.xslObj.loadXsl(JSCL.Engine.xslObj.SOURCETYPE.URL, "Command?cmd=FrameJSCLXslXml&xsl=JSCL.Engine.xsl");
JSCL.Engine.Generator =
  JSCL.Lang.Class("JSCL.Engine.Generator", JSCL.Net.Xml,
                  function(publ, supr) {
                    publ.init = function(){
                      supr(this).init();
                      this.useCache = publ.CACHETYPE.URL;
                      this.neededRoot = 'rhtml';
                    };
                    publ._sourceTypeForm = publ.SOURCETYPE.URL;
                    // publ.xsl = null;

                    publ.setDatasource = function(ds) {
                      this.datasource = ds;
                    };
                    publ.generate =  function(targetElm) {
                      eval(this.generateSrc(targetElm));
                    }
                    publ.generateSrc = function(targetElm) {
                      this.retrieveData();
                      if (targetElm) {
                        var node = document.getElementById(targetElm);
                        if (node !== null) {
                          clearNodeList(node);
                        }
                        targetElm = "'"+targetElm+"'";
                        node = null;
                      } else{
                        targetElm = "null";
                      }
                      // kiment(this.xml);
                      JSCL.Engine.xslObj.setData(JSCL.Engine.xslObj.SOURCETYPE.NODE, this.xml);
                      JSCL.Engine.xslObj.retrieveData();
                      // this.xsl = JSCL.Engine.xslObj.xsl;
                      this.onStart();
                      var xSrc = JSCL.Engine.xslObj.transform();
                      delete this.xml;
                      this.xml = null;
                      xSrc = xSrc.replace(/#PARENTELEM#/g, targetElm);
                      if (developByFigaro) {
                        logger.debug(xSrc);
                      }
                      this.onStop();
                      return (xSrc);
                    };
                 }
                 );
JSCL.Engine.Command =
  JSCL.Lang.Class("JSCL.Engine.Command", JSCL.Engine.Generator,
                  function(publ, supr) {
                    publ.init = function(command){
                      supr(this).init();
                      this.setData(this.SOURCETYPE.URL, "Command");
                      this.setParameter("cmd", command);
                    };
                  }
                 );
JSCL.Application.Base =
  JSCL.Lang.Class("JSCL.Application.Base",
                  function(publ) {
                    /**
                     Initializes a new base object.
                     @param id           
                     */
                    publ.init = function(id) {
                      this.id = id;
                    };
                    publ.id = null;
                  }
                 );

JSCL.namespace("JSCL.UI.SzotarasKodfeloldo");

JSCL.UI.SzotarasKodfeloldo.Cols = [["K\xf3dsz\xf3", "Nev", "String"], ["Megnevez\xe9s", "Ertek", "String"]];

JSCL.UI.SzotarasKodfeloldo.Kilepes = function (src, ea) {
	WWWWWW.tartalom.closeLayer();
	WWWWWW.menu.displayMenu(true);
	JSCL.UI.SzotarasKodfeloldo.kod_modosult = false;
};

JSCL.UI.SzotarasKodfeloldo =
  JSCL.Lang.Class("JSCL.UI.SzotarasKodfeloldo", JSCL.Application.Base,

                  function(publ, supr) {
                    publ.init = function(id, _tbMegnevezes, _tbKod, default_kod, _feloldoBean, _taskInstanceId, _kodcsoport, _provId) {

                      supr(this).init(id);

                      this.tbKod = document.getElementById(_tbKod);
                      this.tbKod.jsObject = this;

                      this.tbMegnevezes = document.getElementById(_tbMegnevezes);
                      this.tbMegnevezes.jsObject = this;

                      this.feloldoBean = _feloldoBean;
                      this.taskInstanceId = _taskInstanceId;
                      this.kodcsoport = _kodcsoport;

                      this.provId = _provId;
                      //publ.defaultKod = default_kod;
                      //if(default_kod) publ.tbKod.value = default_kod;

						if (msie) {
							this.tbKod.onbeforedeactivate.Add(this.feloldas);
							this.tbKod.onblur.Add(this.feloldas);
						} else {
							this.tbKod.onblur.Add(this.feloldas);
						}

						this.tbKod.onchange.Add(this.kodModosul);

						// megjelenésbeli kozmetikázás FF miatt (neki van igaza)
						var helperBtn = document.getElementById(_tbKod+'BTN');
						helperBtn.style.cssText = helperBtn.style.cssText + ';display: inline;';

                    }

                    publ.tbKod;
                    publ.tbMegnevezes;
                    publ.btnHelper;
                    publ.defaultKod;
                    publ.kod_modosult = false;
                    publ.grid;
                    publ.searchField;
                    publ.feloldoBean;
                    publ.taskInstanceId;
                    publ.kodcsoport;
                    publ.provId;

                    publ.updateField = function(fld, value) {
                      var elem = document.getElementById(fld);
                      elem.value = value;
                    }


                    publ.showGrid = function() { // paraméterként kapja a fontos dolgokat
                        var popupFrameFrame = WWWWWW.tartalom.openLayer();
						var oEngine = new JSCL.Engine.Generator();
						oEngine.setData(oEngine.SOURCETYPE.EMBEDDED, "PopupIsland");
						oEngine.generate(popupFrameFrame.id);
						var popupFrameDiv = document.getElementById("PopupDiv");

						try {
							var dbFeloldo = new JSCL.Database.Database();
							dbFeloldo.setData(dbFeloldo.SOURCETYPE.URL, "Command");
							dbFeloldo.setParameter("cmd", "SzotarasKodfeloldoXml");
							dbFeloldo.setParameter("feloldo", this.feloldoBean);
							dbFeloldo.setParameter("taskInstanceId", this.taskInstanceId);
							dbFeloldo.setParameter("kodcsoport", this.kodcsoport);
							dbFeloldo.setParameter("provId", this.provId);

							var errFeloldo = new JSCL.Database.Errors(dbFeloldo);
							dsFeloldoAll = new JSCL.Database.Datasource("SzotarValaszto", dbFeloldo);
							dsFeloldoAll.name = "Row";
							dbFeloldo.retrieveData();
							if (errFeloldo.isError()) {
								var errC = errFeloldo.getCount();
								for (var i = 1; i <= errC; i++) {
									errFeloldo.setPosition(i);
									logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
									alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
								}
							} else {

								var instruction = document.createTextNode(" Keresés a megnevezések között: ");
								popupFrameDiv.appendChild(instruction);
								var tbFilterKod = new JSCL.UI.Textbox("tbFilterKod_ID", popupFrameDiv, {}, false);
								var tbSearchKod = new JSCL.UI.Button("tbSearchKod_ID", popupFrameDiv, {caption:"Keresés",
																										style_width:"55px",
																										style_display:"inline"}, false);
								tbSearchKod.searchField = tbFilterKod;
								this.searchField = tbFilterKod;

								var GridSpace_div = new JSCL.UI.Generic("DIV", popupFrameDiv, {id:"GridSpace"});
								var oSZFGRID = new JSCL.UI.SzotarasKodfeloldo.Grid();
								oSZFGRID.letolt(document.getElementById("GridSpace"), dsFeloldoAll, JSCL.UI.SzotarasKodfeloldo.Cols,
									this.tbMegnevezes, this.tbKod);

								tbSearchKod.view.onclick.Add(function(src, ea) {
			                       oSZFGRID.doSearch(src, ea);
			                    });

			                    tbFilterKod.view.onkeydown.Add(this.enter);
			                    //ezzel prioritása van annak a hatásnak, hogy IE-ben müködik, hogy az enternek tab hatása van

			                    //tbFilterKod.view.onkeydown = this.enter;


			                    tbFilterKod.view.jsObject.grid = oSZFGRID;
			                    tbFilterKod.view.jsObject.searchField = tbFilterKod;

								this.kod_modosult = false;

								var IDAXUXWJC = new JSCL.UI.Generic("DIV", popupFrameDiv, {id:"PopUpButton"});
								var gombok = new WWWWWW.FormGen.PopUpButtons("GombSor", "PopUpButton", {}, this.Kilepes);
								gombok.jsObject = this;
							}
						}
						catch (ex) {
							WWWWWW.tartalom.closeLayer();
							WWWWWW.menu.displayMenu(true);
						}

                    }


                    publ.kodModosul = function(src, ea) {
                    	src.jsObject.kod_modosult = true;
                    }

                    publ.enter = function(src, ea) {
                      if(ea.event.keyCode == 13) // enter pressed
                      {
                        src.jsObject.grid.doSearch(src, ea);
                       }
                    }

                    publ.feloldas = function(src, ea) {

					  var self = src.jsObject;

                      //window.alert('feloldas:' + this.tbKod.value);

					  if(self.kod_modosult && self.tbKod.value.length > 0) {

					   	self.kod_modosult = false;

					    var db = new JSCL.Database.Database();
						db.setData(db.SOURCETYPE.URL, "Command");
						db.setParameter("cmd", "SzotarasKodfeloldoFeloldasXml");
						db.setParameter("code", self.tbKod.value);
						db.setParameter("taskInstanceId", self.taskInstanceId);
						db.setParameter("feloldo", self.feloldoBean);
						db.setParameter("kodcsoport", self.kodcsoport);
						db.setParameter("provId", self.provId);

						var err = new JSCL.Database.Errors(db);
						ds = new JSCL.Database.Datasource("SzotarFeloldas", db);

						ds.name = "Row";
						db.retrieveData();

						if (err.isError()) {
							var errC = err.getCount();
							for (var i = 1; i <= errC; i++) {
								err.setPosition(i);
								logger.debug(err.getCode() + "-" + err.getMessage());
								alert(err.getCode() + "-" + err.getMessage());
							}
						} else {

							  ds.goToFirst();

							  var feloldas = ds.getField('Ertek');
							  var nev = ds.getField('Nev');

					          if(feloldas.length > 0) {
					          	self.tbMegnevezes.value = feloldas;
					          	self.tbKod.value = nev;
					          } else {
					            window.alert('Nem sikerült feloldani a kódot!');
					            self.tbMegnevezes.value='';
					            self.kod_modosult=true;

					            //Firefox-ban csak késleltetve mukodik
					            if(!msie) {
					              setTimeout("JSCL.UI.SzotarasKodfeloldo.FocusAndSelect(" + self.tbKod.id +")", 10);
					            } else {
					              self.tbKod.select();
					            }

					          }
						}

					   }
					}

					 publ.Kilepes = function(src, ea) {
					   //src.jsObject.kod_modosult = true;
					   WWWWWW.tartalom.closeLayer();
					   WWWWWW.menu.displayMenu(true);
					 }



                  }
                 )
  ;


JSCL.UI.SzotarasKodfeloldo.FocusAndSelect = function(target) {
	//target.focus();
	//target.select();
	try {
	  document.getElementById(target.id).focus();
	  document.getElementById(target.id).select();
	} catch (ex) {

	}
}


JSCL.UI.SzotarasKodfeloldo.Grid =
	JSCL.Lang.Class("JSCL.UI.SzotarasKodfeloldo.Grid", JSCL.Application.Base, function (publ, supr) {
		publ.init = function (id) {
			supr(this).init(id);
		};
		publ.callCount = 0;
		publ.state = 0;
		publ.COLUMNS = {"Head":0, "Data":1, "Type":2};

	    publ.Cols = [["K\xf3dsz\xf3", "Nev", "String"], ["Megnevez\xe9s", "Ertek", "String"]];

	    publ.datasource;
	    publ.datagrid;

		publ.updateField = function (fld, val) {
			fld.value = val;
		};

		publ.letolt = function (targetElm, ds, oszlopok, _tbMegn, _tbKod) {

			var grid = new JSCL.UI.Tablegrid("Grid");
			this.datagrid = grid;

			if (typeof targetElm == "undefined") {
				targetElm = "";
			}
			grid.id = "grid" + targetElm;
			grid.setData(ds);
			this.datasource = ds;

			this.searchBackupXML = ds.xml;

			grid.height = getGridHeight(50)+"px";
			grid.columnsCount = publ.Cols.length;

			grid.columnsHead = function (i) {
				return publ.Cols[i][publ.COLUMNS.Head];
			};
			grid.columnsData = function (i) {
				return publ.Cols[i][publ.COLUMNS.Data];
			};
			grid.columnsType = function (i) {
				return publ.Cols[i][publ.COLUMNS.Type];
			};
			grid.onRowClick = function (i) {

				publ.updateField(_tbKod, ds.getField("Nev"));
				publ.updateField(_tbMegn, ds.getField("Ertek"));

				WWWWWW.tartalom.closeLayer();
				WWWWWW.menu.displayMenu(true);
			};

			grid.generate(targetElm);
		};

		publ.doSearch = function(src, ea) {
  		    var searched = src.jsObject.searchField.view.value;
  		    // TODO: hosszú ü és ö betük kihagyva!
  		     var XPathFilterSuffix = "[contains(translate(Ertek,'ABCDEFGHIJKLMNOPQRSTUVWXYZÖÜÓÚÉÁÍ'," +
  		    							"'abcdefghijklmnopqrstuvwxyzöüóúéáí'),'" + searched.toLowerCase() + "')]";
  		    this.datasource.setFilter(XPathFilterSuffix);
		}

});



JSCL.namespace("JSCL.UI.CascadeComponent");

/* Minden kaszkad komponens noveli 1-el letrehozasakor
es a sikeres szulohoz kapcsolodas utan csokkenti 1-el.

Ha nulla e valtozo, akkor tudjuk, hogy minden kaszkad komponensnek sikerult
regisztralni magat a szulojenel */

JSCL.UI.CascadeComponent.bindInProgressCounter = 0;

/* Segedfuggveny az onReposition kesleltetesehez */
JSCL.UI.CascadeComponent.repositionCallback = function(id) {
  var comp = document.getElementById(id);
  if(comp) {
    comp.jsObject.onParentReposition();
  }
};

JSCL.namespace("JSCL.UI.CascadeKodfeloldo");

JSCL.UI.CascadeKodfeloldo =
  JSCL.Lang.Class("JSCL.UI.CascadeKodfeloldo", JSCL.UI.DBComponent,

                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {

                      this.calcParent(szulo);
                      this.parentComponent = isUndef(f.parent) ? '' : f.parent;
                      this.acsl = f.acsl;
                      this.field = f.field;
                      this.col1head = f.col1head;
                      this.col2head = f.col2head;
                      this.feloldoBean = f.feloldo;
                      this.taskInstanceId = f.taskInstanceId;
                      this.processInstanceId = f.processInstanceId;
                      this.kodcsoport = f.codegroup;

                      if(f.disabled) {
                    	  this.tbKod = new JSCL.UI.Textbox(id, szulo, { id: id, helper : '0'}, '');
                      } else {
                          this.tbKod = new JSCL.UI.Textbox(id, szulo, { id: id, helper : '1', onHelper: 'src.jsObject.gazda.showGrid();'}, '');
                      }
                      this.tbKod.gazda = this;
                      this.tbKod.view.size = f.codefieldwidth;

                      this.provId = f.provid;
                      this.readonly = f.disabled;

                      if(!f.disabled) {
					    var helperBtn = document.getElementById(id + 'BTN');
					    helperBtn.style.cssText = helperBtn.style.cssText + ';display: inline;';
					    //helperBtn.onkeypress = this.showGridSkip;
					    helperBtn.onkeydown = this.showGridSkip;
                      }

                      this.view = this.tbKod.view;
                      this.view.name = id;
                      this.view.id = id;
                      this.view.jsObject = this;
                      this.defval = f.value;

                      supr(this).init(id, {field: f.field});

                      this.tbMegnevezes = new JSCL.UI.Textbox(id+'_MEGN', szulo, { id: id + '_MEGN'}, '');
                      this.tbMegnevezes.view.gazda = this;
                      this.tbMegnevezes.view.jsObject = this;
                      this.tbMegnevezes.view.size = f.namefieldwidth;
                      this.tbMegnevezes.view.disabled = true;

                      //this.parent.appendChild(this.view);
                      //addAttribute(this.view, "size", 1);

                      if(!f.disabled) {
						if (msie) {
							this.tbKod.view.onbeforedeactivate.Add(this.feloldas);
							this.tbKod.view.onblur.Add(this.feloldas);
						} else {
							this.tbKod.view.onblur.Add(this.feloldas);
						}

						this.tbKod.view.onchange.Add(this.kodModosul);
                      }
                      
						this.tbKod.setEnterStep();

						this.listeners = [];

						//this.setDisabled(true);

                      if(this.parentComponent == '') {
                        //itt nem kell listat letolteni, mint a combo-nál
                        this.setDisabled(false);
                      } else {
                        this.tbMegnevezes.setValue('Folyamatban..');
                        this.setDisabled(true);

                        JSCL.UI.CascadeComponent.bindInProgressCounter++;

                        //kiserletet teszunk a szulonel onmagunk listenerkent valo regisztralasara
                        JSCL.UI.CascadeKodfeloldo.bindParent(this.parentComponent, this.id);
                      }
                    }

                    publ.parentComponent;
                    publ.tbKod;
                    publ.tbMegnevezes;
                    publ.btnHelper;
                    publ.kod_modosult = false;
                    publ.grid;
                    publ.searchField;
                    publ.feloldoBean;
                    publ.kodcsoport;
                    publ.desiredValue = '';
                    publ.listeners;
                    publ.disabled;
                    publ.field;
                    publ.provId;
                    publ.readonly;
                    publ.col1head;
                    publ.col2head;

                    /* A form mentesekor a kulcs-ertek parok kulcsat ezzel kerik el tolunk. */
                    publ.getId = function() {
						return (this.field);
					};

                    publ.setDisabled = function(dis) {
                      this.tbKod.view.disabled = dis || this.readonly;
                      this.disabled = dis;
                    };

                    publ.updateField = function(fld, value) {
                      var elem = document.getElementById(fld);
                      elem.value = value;
                    };

                    publ.onReposition = function() {

                      if(this.parentComponent == '') {

                        // ha mi vagyunk a hierarchia csucsan, akkor..
                        // leterjesztjuk a valodi reposition muveletet, magunkkal kezdve
						this.onParentReposition();

                      } else {
                        // egyebkent meg tetlenul varjuk, hogy majd felulrol kezdemenyezzek a repositiont (onParentReposition)
                      }
                    };

                    publ.repositionListeners = function() {
                    	var l = this.listeners.length;
                         for (var i = 0; i < l; i++) {
                           var comp = this.listeners[i];
                            try {
                              this.listeners[i].onParentReposition();
                            } catch (ex) {
                            }
                         }
                    };

                    publ.onParentReposition = function() {
                    	try {
	                        var fieldName_without_wf = this.field.substring(2, this.field.length);
	                        var value = this.datasource.getField(fieldName_without_wf);
	                        if (value == '') {
	                          this.desiredValue = '';
	                        } else {
	                          this.desiredValue = value;
	                        }

	                        if(JSCL.UI.CascadeComponent.bindInProgressCounter > 0) {
	                          // varunk a kotesek befejezodeseig
	                          //window.alert('early reposition.. :-(');

	                          setTimeout("JSCL.UI.CascadeComponent.repositionCallback('" + this.id + "');", 500);
	                        } else {
	                       		this.repositionListeners();

	                       		if(this.parentComponent == '') {
	                       		  // beallitjuk sajat magunk erteket, s ez lefele is elinditja a folyamatot
								  this.onParentChange();
	                       		}
  	                        }

                      } catch (e) {
                      }
                    };

                    publ.addListener = function(elem) {
                      var lelt = false;
                      var l = this.listeners.length;
                      for (var i = 0; i < l; i++) {
                        var comp = this.listeners[i];
                        if (elem.id == comp.id) {
                          lelt = true;
                          break;
                        }
                      }
                      if (lelt === false) {
                        this.listeners.push(elem);
                      }
                    };

                    publ.putSelection = function(arr) {
                       if(this.parentComponent != '') {
                         var p = document.getElementById(this.parentComponent);
                         p.jsObject.putSelection(arr);
                       }
                       arr[this.field] = this.getValue();
                    };

                    publ.notifyListeners = function() {
                     var l = this.listeners.length;
                         for (var i = 0; i < l; i++) {
                           var comp =  this.listeners[i];
                            try {
                              this.listeners[i].onParentChange();
                            } catch (ex) {
                              var u = ex;
                            }
                         }
                    };

                    publ.onParentChange = function() {
                      if(this.desiredValue == '') {
                        this.clear();
                      } else {
                        this.tbKod.setValue(this.desiredValue);
                        this.kod_modosult = true;
                        this.setDisabled(false); // hogy elinduljon a feloldas
                        this.feloldas(this.view);
                      }

                      if(this.parentComponent != '') {
	                      var parentContent = document.getElementById(this.parentComponent).value;
	                      if(parentContent) {
	                        if(parentContent == 'N/A' || parentContent.length == 0) {
	                          this.setDisabled(true);
	                        } else {
							  this.setDisabled(false);
							}
	                      } else {
	                        this.setDisabled(true);
	                      }
                      } else {
                        this.setDisabled(false);
                      }
                    };

                    publ.clear = function() {
                    	this.tbKod.setValue('');
                    	this.tbMegnevezes.setValue('');
                    	this.notifyListeners();
                    };
					publ.showGridSkip = function(src, ea) {
					  if(event.keyCode == 13) {
					    event.keyCode = 9;
					  }
					};
                    publ.showGrid = function() {

                       if(this.disabled) {

                         window.alert("Nincs kiválasztott elem a felettes komponensben.");

                       } else {

	                        var popupFrameFrame = WWWWWW.tartalom.openLayer();
							var oEngine = new JSCL.Engine.Generator();
							oEngine.setData(oEngine.SOURCETYPE.EMBEDDED, "PopupIsland");
							oEngine.generate(popupFrameFrame.id);
							var popupFrameDiv = document.getElementById("PopupDiv");

							try {

								var dbFeloldo = new JSCL.Database.Database();
								dbFeloldo.setData(dbFeloldo.SOURCETYPE.URL, "Command");
								dbFeloldo.setParameter("cmd", "SzotarasKodfeloldoXml");
								dbFeloldo.setParameter("feloldo", this.feloldoBean);
								dbFeloldo.setParameter("kodcsoport", this.kodcsoport);
								dbFeloldo.setParameter("provId", this.provId);
								dbFeloldo.setParameter("taskInstanceId", this.taskInstanceId);
								dbFeloldo.setParameter("processInstanceId", this.processInstanceId);

								/* Osszegyujtjuk a felettunk allo komponensek tartalmait */
								var arr = [];
			                    if(this.parentComponent != '') {
			                         var p = document.getElementById(this.parentComponent);
			                         p.jsObject.putSelection(arr);
				                }

		                        arr[this.field] = this.getValue();

								for(var i in arr) {
								  var t = i.substring(0,2);
								  if(t == "wf") dbFeloldo.setParameter(i, arr[i]);
								}

								var errFeloldo = new JSCL.Database.Errors(dbFeloldo);
								dsFeloldoAll = new JSCL.Database.Datasource("SzotarValaszto", dbFeloldo);
								dsFeloldoAll.name = "Row";
								dbFeloldo.retrieveData();
								if (errFeloldo.isError()) {
									var errC = errFeloldo.getCount();
									for (var i = 1; i <= errC; i++) {
										errFeloldo.setPosition(i);
										logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
										alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
									}
								} else {

									var instruction = document.createTextNode(" Keresés a megnevezések között: ");
									popupFrameDiv.appendChild(instruction);
									var tbFilterKod = new JSCL.UI.Textbox("tbFilterKod_ID", popupFrameDiv, {}, false);
									var tbSearchKod = new JSCL.UI.Button("tbSearchKod_ID", popupFrameDiv, {caption:"Keresés",
																											style_width:"55px",
																											style_display:"inline"}, false);
									tbSearchKod.searchField = tbFilterKod;
									this.searchField = tbFilterKod;

									var GridSpace_div = new JSCL.UI.Generic("DIV", popupFrameDiv, {id:"GridSpace"});
									var oSZFGRID = new JSCL.UI.CascadeKodfeloldo.Grid(this.col1head, this.col2head);
									oSZFGRID.letolt(document.getElementById("GridSpace"), dsFeloldoAll, this.tbMegnevezes, this.tbKod, this.col1head, this.col2head);

									tbSearchKod.view.onclick.Add(function(src, ea) {
				                       oSZFGRID.doSearch(src, ea);
				                    });

				                    tbFilterKod.view.onkeydown.Add(this.enter);
				                    //ezzel prioritása van annak a hatásnak, hogy IE-ben müködik, hogy az enternek tab hatása van

				                    //tbFilterKod.view.onkeydown = this.enter;


				                    tbFilterKod.view.jsObject.grid = oSZFGRID;
				                    tbFilterKod.view.jsObject.searchField = tbFilterKod;

									this.kod_modosult = false;

									var IDAXUXWJC = new JSCL.UI.Generic("DIV", popupFrameDiv, {id:"PopUpButton"});
									var gombok = new WWWWWW.FormGen.PopUpButtons("GombSor", "PopUpButton", {}, this.Kilepes);
									gombok.jsObject = this;
								}
							}
							catch (ex) {
								WWWWWW.tartalom.closeLayer();
								WWWWWW.menu.displayMenu(true);
							}
						}
                    }


                    publ.kodModosul = function(src, ea) {
                    	src.jsObject.kod_modosult = true;
                    	this.desiredValue='';
                    };

                    publ.enter = function(src, ea) {
                      if(ea.event.keyCode == 13) // enter pressed
                      {
                        src.jsObject.grid.doSearch(src, ea);
                       }
                    };

                    publ.feloldas = function(src, ea) {

					  var self = src.jsObject;

					  if(!self.disabled && self.kod_modosult && self.tbKod.view.value.length == 0) {
						  /* bug 1512, urithetoseg */
						  self.tbMegnevezes.setValue('');
					  }

					  if(!self.disabled && self.kod_modosult && self.tbKod.view.value.length > 0) {

					   	self.kod_modosult = false;

					    var db = new JSCL.Database.Database();
						db.setData(db.SOURCETYPE.URL, "Command");
						db.setParameter("cmd", "SzotarasKodfeloldoFeloldasXml");
						db.setParameter("code", self.tbKod.getValue());
						db.setParameter("feloldo", self.feloldoBean);
						db.setParameter("kodcsoport", self.kodcsoport);
						db.setParameter("provId", self.provId);
						db.setParameter("taskInstanceId", self.taskInstanceId);
						db.setParameter("processInstanceId", self.processInstanceId);

						/* Osszegyujtjuk a felettunk allo komponensek tartalmait */
						var arr = [];
	                    if(self.parentComponent != '') {
	                         var p = document.getElementById(self.parentComponent);
	                         p.jsObject.putSelection(arr);
		                }

						for(var i in arr) {
						  var t = i.substring(0,2);
						  if(t == "wf") db.setParameter(i, arr[i]);
						}

						var err = new JSCL.Database.Errors(db);
						ds = new JSCL.Database.Datasource("SzotarFeloldas", db);

						ds.name = "Row";
						db.retrieveData();

						if (err.isError()) {
							var errC = err.getCount();
							for (var i = 1; i <= errC; i++) {
								err.setPosition(i);
								logger.debug(err.getCode() + "-" + err.getMessage());
								alert(err.getCode() + "-" + err.getMessage());
							}
						} else {

							  ds.goToFirst();

							  var feloldas = ds.getField('Ertek');
							  var nev = ds.getField('Nev');

					          if(feloldas.length > 0) {
					          	self.tbMegnevezes.setValue(feloldas);
					          	self.tbKod.setValue(nev);

					          	self.notifyListeners();

					          	self.desiredValue='';

					          } else {
					            window.alert('Nem sikerült feloldani a kódot! (Ha nem tudja a kódot, hagyja üresen.)');
					            self.tbMegnevezes.setValue('');
					            self.kod_modosult=true;


					            //Firefox-ban csak késleltetve mukodik
					            if(!msie) {
					              setTimeout("JSCL.UI.CascadeKodfeloldo.FocusAndSelect(" + self.tbKod.id +")", 10);
					            } else {
					              self.tbKod.view.select();
					            }

					          }
						}

					   }

					}

					 publ.Kilepes = function() {
					   WWWWWW.tartalom.closeLayer();
					   WWWWWW.menu.displayMenu(true);
					 }

                  }
                 )
  ;


JSCL.UI.CascadeKodfeloldo.FocusAndSelect = function(target) {
	//target.focus();
	//target.select();
	try {
	  document.getElementById(target.id).focus();
	  document.getElementById(target.id).select();
	} catch (ex) {

	}
}


JSCL.UI.CascadeKodfeloldo.Grid =
	JSCL.Lang.Class("JSCL.UI.CascadeKodfeloldo.Grid", JSCL.Application.Base, function (publ, supr) {
		publ.init = function (id) {
			supr(this).init(id);
		};
		publ.callCount = 0;
		publ.state = 0;
		publ.COLUMNS = {"Head":0, "Data":1, "Type":2};

	    publ.Cols = [["K\xf3dsz\xf3", "Nev", "String"], ["Megnevez\xe9s", "Ertek", "String"]];

	    publ.datasource;
	    publ.datagrid;

		publ.updateField = function (fld, val) {
			fld.setValue(val);
		};

		publ.letolt = function (targetElm, ds, _tbMegn, _tbKod, col1head, col2head) {

			var grid = new JSCL.UI.Tablegrid("Grid");
			this.datagrid = grid;

			if (typeof targetElm == "undefined") {
				targetElm = "";
			}
			grid.id = "grid" + targetElm;
			grid.setData(ds);
			this.datasource = ds;

			this.searchBackupXML = ds.xml;

			publ.Cols[0][0] = col1head;
			publ.Cols[1][0] = col2head;
			
			grid.height = getGridHeight(50)+"px";
			grid.columnsCount = publ.Cols.length;

			grid.columnsHead = function (i) {
				return publ.Cols[i][publ.COLUMNS.Head];
			};
			grid.columnsData = function (i) {
				return publ.Cols[i][publ.COLUMNS.Data];
			};
			grid.columnsType = function (i) {
				return publ.Cols[i][publ.COLUMNS.Type];
			};
			grid.onRowClick = function (i) {

				publ.updateField(_tbKod, ds.getField("Nev"));
				publ.updateField(_tbMegn, ds.getField("Ertek"));

				_tbKod.gazda.notifyListeners();

				WWWWWW.tartalom.closeLayer();
				WWWWWW.menu.displayMenu(true);
			};

			grid.generate(targetElm);
		};

		publ.doSearch = function(src, ea) {
  		    var searched = src.jsObject.searchField.view.value;
  		    // TODO: hosszú ü és ö betük kihagyva!
  		     var XPathFilterSuffix = "[contains(translate(Ertek,'ABCDEFGHIJKLMNOPQRSTUVWXYZÖÜÓÚÉÁÍ'," +
  		    							"'abcdefghijklmnopqrstuvwxyzöüóúéáí'),'" + searched.toLowerCase() + "')]";
  		    this.datasource.setFilter(XPathFilterSuffix);
		}

});

//JSCL.UI.CascadeKodfeloldo.Cols = [["K\xf3dsz\xf3", "Nev", "String"], ["Megnevez\xe9s", "Ertek", "String"]];

JSCL.UI.CascadeKodfeloldo.Kilepes = function (src, ea) {
	WWWWWW.tartalom.closeLayer();
	WWWWWW.menu.displayMenu(true);
	JSCL.UI.CascadeKodfeloldo.kod_modosult = false;
};

JSCL.UI.CascadeKodfeloldo.bindParent = function(parent, child) {

      var p = document.getElementById(parent);
      var c = document.getElementById(child);

      if(p) {
        c.jsObject.clear();
        p.jsObject.addListener(c.jsObject);
        JSCL.UI.CascadeComponent.bindInProgressCounter--;
      } else {
        // window.alert(this.id + ' nem találja a szülö elemét: ' + this.parent);
        // a szülö elem még nem készült el, igy kicsit kesobb ujra probalkozunk
        setTimeout("JSCL.UI.CascadeCombo.bindParent('" + parent + "','" + child +"');", 500);
      }
};
JSCL.UI.CascadeCombo =
  JSCL.Lang.Class("JSCL.UI.CascadeCombo", JSCL.UI.Combobox,
                  function(publ, supr) {
                  
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      
                      this.parentComponent = isUndef(f.parent) ? '' : f.parent;
                      this.acsl = f.acsl;
                      this.field = f.field;
                      this.provId = f.provId;
                      this.taskInstanceId = f.taskInstanceId;
                      this.processInstanceId = f.processInstanceId;
                      this.emptyString = isUndef(f.emptystring) ? "Kérem válasszon.." : f.emptystring;
                      
                      // azok a cascadecombo-k, melyek tartalma fugg tolunk
                      this.listeners = [];
                      
                      this.view.onchange.Add(this.selectionChanged);
                      
                      this.view.disabled = true;
                      
                      this.lenyithato = (f.lenyithato == "true");
                      setDisabledCSS(this.view, !this.lenyithato);
                      this.view.size = f.numItems;
                      if(f.width != "0") {
                        this.view.style.width = f.width + "px";
                      }
                      
                      if(this.parentComponent == '') {
                        this.onParentChange(); // a hierarch. tetejetol kezdv lista letoltodeset idezi elo
                      } else {
                        this.add('Folyamatban..', '');
                        
                        JSCL.UI.CascadeComponent.bindInProgressCounter++;
                        
                        //kiserletet teszunk a szulonel onmagunk listenerkent valo regisztralasara
                        JSCL.UI.CascadeCombo.bindParent(this.parentComponent, this.id);
                      }
                    };

					/* Parent component */
					publ.parentComponent;
					
					/* Adatcsoportleiro, amit a lista frissítéséhez kell használni */
					publ.acsl;
					
					/* Az a string, ami üres állapotban megjelenik a dobozban. RP_DEFVAL-ból */
					publ.emptyString;
					
					publ.desiredValue = '';
					                
                 	/* DS listener */
                    publ.onItemFiltering = function() {
                    };
                    
                    publ.listeners;
                    
                    publ.provId;
                    
                    publ.taskInstanceId;
                    
                    publ.processInstanceId;
                    
                    publ.lenyithato;
                    
                    publ.addListener = function(elem) {
                      var lelt = false;
                      var l = this.listeners.length;
                      for (var i = 0; i < l; i++) {
                        var comp = this.listeners[i];
                        if (elem.id == comp.id) {
                          lelt = true;
                          break;
                        }
                      }
                      if (lelt === false) {
                        this.listeners.push(elem);
                      }
                    };
                    
                    /* A form mentesekor a kulcs-ertek parok kulcsat ezzel kerik el tolunk. */
                    publ.getId = function() {
						return (this.field);
					}; 

                    /* A kapott array-ba beleteszi az ertekunket valamint a felettunk allok ertekeit is*/
                    publ.putSelection = function(arr) {
                       if(this.parentComponent != '') {
                         var p = document.getElementById(this.parentComponent);
                         p.jsObject.putSelection(arr);
                       }
                       arr[this.field] = this.getValue();
                    };
                    
                    publ.selectionChanged = function(src, ea) {
                         src.jsObject.notifyListeners(src.jsObject.listeners);
                    };
                    
                    publ.notifyListeners = function(list) {
                     var l = list.length;
                         for (var i = 0; i < l; i++) {
                           var comp =  list[i];
                            try {
                              list[i].onParentChange();
                            } catch (ex) {
                              var u = ex;
                            }
                         }
                    };
                    
                    publ.onParentChange = function() {
                      var arr = [];
                      
                      // osszegyujtjuk a hierarchiaban felettunk levok tartalmat
                      if(this.parentComponent != '') {
                         var p = document.getElementById(this.parentComponent);
                         p.jsObject.putSelection(arr);
	                  }
                      
                      // hozzatesszuk a sajat tartalmunkat
                      arr[this.field] = this.getValue();
                      
                      this.clear();
                      
                      // ezek alapjan lekerjuk a sajat listankat
                      this.retrieveDataFor(arr);
                      
                      // jelzes az alattunk levo boxoknak
					  this.notifyListeners(this.listeners);
					  
                    };
                    
                    publ.onReposition = function() {
                    
                      if(this.parentComponent == '') {

                        // ha mi vagyunk a hierarchia csucsan, akkor..
                        // leterjesztjuk a valodi reposition muveletet, magunkkal kezdve
						this.onParentReposition();                        

                      } else {
                        // egyebkent meg tetlenul varjuk, hogy majd felulrol kezdemenyezzek a repositiont (onParentReposition)
                      }
                    };
                    
                    publ.repositionListeners = function() {
                    	var l = this.listeners.length;
                         for (var i = 0; i < l; i++) {
                           var comp =  this.listeners[i];
                            try {
                              this.listeners[i].onParentReposition();
                            } catch (ex) {
                            }
                         }
                    };
                    
                    publ.onParentReposition = function() {
                    	try {
	                        var fieldName_without_wf = this.field.substring(2, this.field.length);
	                        var value = this.datasource.getField(fieldName_without_wf);
	                        if (value == '') {
	                          this.desiredValue = '';                
	                        } else {
	                          this.desiredValue = value;
	                        }
	                        
	                        if(JSCL.UI.CascadeComponent.bindInProgressCounter > 0) {
	                          // varunk a kotesek befejezodeseig
	                          //window.alert('early reposition.. :-(');
	                          
	                          setTimeout("JSCL.UI.CascadeComponent.repositionCallback('" + this.id + "');", 500);
	                        } else {
	                       		this.repositionListeners();
	                       		
	                       		if(this.parentComponent == '') {
	                       		  // beallitjuk sajat magunk erteket, s ez lefele is elinditja a folyamatot
								  this.onParentChange();
	                       		}
  	                        }
	                       
                      } catch (e) {
                      }
                    };
                    
                    // lista lekerese, parameterkent a sajat es az osszes felettunk allo box tartalma erkezik
                    publ.retrieveDataFor = function(arr) {
                    	var res = [];
                    	
                    	var db = new JSCL.Database.Database();
						db.setData(db.SOURCETYPE.URL, "Command");
						db.setParameter("cmd", "CascadeComboXml");
						db.setParameter("acsl", this.acsl);
						db.setParameter("id", this.id);
						db.setParameter("provId", this.provId);
						db.setParameter("taskInstanceId", this.taskInstanceId);
						db.setParameter("processInstanceId", this.processInstanceId);
						
						// a fuggvenyeket is bejarna az i valtozo, ezert vizsgalunk wf-re
						for(var i in arr) {
						  var t = i.substring(0,2);
						  if(t == "wf") db.setParameter(i, arr[i]);
						}
						
						var errFeloldo = new JSCL.Database.Errors(db);
						ds = new JSCL.Database.Datasource("CascadeCombo", db);
						ds.name = "Option";
						db.retrieveData();
						
						if (errFeloldo.isError()) {
							var errC = errFeloldo.getCount();
							for (var i = 1; i <= errC; i++) {
								errFeloldo.setPosition(i);
								logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
								alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
							}
						} else {
						  ds.goToFirst();
				  
				  		  if(ds.getCount() > 0) {
						      this.view.disabled = (false || !this.lenyithato);
						      if(ds.getCount() > 1) {
						        this.add(this.emptyString, '');
						      }
						  } else {
						    this.add('N/A', '');
						    this.view.disabled = true;
						  }
						  
						  for(var i = 1; i <= ds.getCount(); i++) {
						    ds.setPosition(i);
						    this.add(ds.getField('Nev'),ds.getField('Ertek'));
						    if(ds.getCount() == 1) {
						      this.view.selectedIndex = 0;
						    }
						  }
						  
						  if(this.desiredValue == '') {
						      //ha nincs eltarolva megjelenitendo cimke, akkor a 'kerem valasszon-ra megyunk'
						      this.view.selectedIndex = 0;
						    } else {
						      // egyebkent kitesszuk azt az opciot, amire vagytunk eddig
						      
						      //this.view.value = this.desiredValue;
						      for(var t = 0; t < this.view.length; t++) {
						        if(this.view.options[t].text == this.desiredValue ||
						           this.view.options[t].value == this.desiredValue) {
						          this.view.options[t].selected = true;
						          break;
						        }
						      }
						      
						      this.desiredValue = '';
						    }
						    
						}
						
                    };
                    
                    
                  }
                 )
  ;

/* a szulo komponenseknek nincs informaciojuk a gyermekeikrol, csak a gyermek tudja
kezdemenyezni a listener-es kapcsolatteremtest. mivel nem tudjuk milyen sorrendben
peldanyosulnak a komponensek, ezert a cascadecombo folyamatosan probalja a szuloelemenel
regisztralni magat. amint a szulo elem is peldanyosult, akkor sikerrel fogunk jarni.
egyeb esetben pedig letiltott allapotban var a komponens. */

JSCL.UI.CascadeCombo.bindParent = function(parent, child) {

      var p = document.getElementById(parent);
      var c = document.getElementById(child);
    
      if(p) {
        c.jsObject.clear();
        c.jsObject.add(c.jsObject.emptyString, '');
        p.jsObject.addListener(c.jsObject);
        JSCL.UI.CascadeComponent.bindInProgressCounter--;
      } else {
        // window.alert(this.id + ' nem találja a szülö elemét: ' + this.parent);
        // a szülö elem még nem készült el, igy kicsit kesobb ujra probalkozunk
        setTimeout("JSCL.UI.CascadeCombo.bindParent('" + parent + "','" + child +"');", 500);
      }
};

;
JSCL.UI.CascadeTextfield =
  JSCL.Lang.Class("JSCL.UI.CascadeTextfield", JSCL.UI.Textbox,
                  function(publ, supr) {
                  
                    publ.init = function(id, szulo, f, kotelezo) {
                      supr(this).init(id, szulo, f, kotelezo);
                      
                      this.parentComponent = isUndef(f.parent) ? '' : f.parent;
                      this.acsl = f.acsl;
                      this.field = f.field;
                      this.provId = f.provId;
                      this.taskInstanceId = f.taskInstanceId;
                      this.processInstanceId = f.processInstanceId;
                      this.emptyString = isUndef(f.emptystring) ? "" : f.emptystring;
                      
                      // azok a Cascadexxx-ek, melyek tartalma fugg tolunk
                      this.listeners = [];
                      
                      this.view.onchange.Add(this.selectionChanged);
                      
                      this.view.disabled = true;
                      if(f.width != "0") {
                    	  this.view.style.cssText = this.view.style.cssText + ';' + f.width + 'px'; 
                      }
                      
                      if(f.field.charAt(2) == '_') {
                    	  this.view.style.cssText = this.view.style.cssText + ';display: none;';
                      }

                      
                      if(this.parentComponent == '') {
                        this.onParentChange(); // a hierarch. tetejetol kezdv lista letoltodeset idezi elo
                      } else {
                        JSCL.UI.CascadeComponent.bindInProgressCounter++;
                        //kiserletet teszunk a szulonel onmagunk listenerkent valo regisztralasara
                        JSCL.UI.CascadeKodfeloldo.bindParent(this.parentComponent, this.id);
                      }
                    };

					/* Parent component */
					publ.parentComponent;
					
					/* Adatcsoportleiro, amit a lista frissítéséhez kell használni */
					publ.acsl;
					
					/* Az a string, ami üres állapotban megjelenik a dobozban. RP_DEFVAL-ból */
					publ.emptyString;
					
					publ.desiredValue = '';
					                
                 	/* DS listener */
                    publ.onItemFiltering = function() {
                    };
                    
                    publ.listeners;
                    
                    publ.provId;
                    
                    publ.taskInstanceId;
                    
                    publ.processInstanceId;
                    
                    publ.clear = function() {
                    	this.view.value = '';
                    }
                    
                    publ.addListener = function(elem) {
                      var lelt = false;
                      var l = this.listeners.length;
                      for (var i = 0; i < l; i++) {
                        var comp = this.listeners[i];
                        if (elem.id == comp.id) {
                          lelt = true;
                          break;
                        }
                      }
                      if (lelt === false) {
                        this.listeners.push(elem);
                      }
                    };
                    
                    /* A form mentesekor a kulcs-ertek parok kulcsat ezzel kerik el tolunk. */
                    publ.getId = function() {
						return (this.field);
					}; 

                    /* A kapott array-ba beleteszi az ertekunket valamint a felettunk allok ertekeit is*/
                    publ.putSelection = function(arr) {
                       if(this.parentComponent != '') {
                         var p = document.getElementById(this.parentComponent);
                         p.jsObject.putSelection(arr);
                       }
                       arr[this.field] = this.getValue();
                    };
                    
                    publ.selectionChanged = function(src, ea) {
                         src.jsObject.notifyListeners(src.jsObject.listeners);
                    };
                    
                    publ.notifyListeners = function(list) {
                     var l = list.length;
                         for (var i = 0; i < l; i++) {
                           var comp =  list[i];
                            try {
                              list[i].onParentChange();
                            } catch (ex) {
                              var u = ex;
                            }
                         }
                    };
                    
                    publ.onParentChange = function() {
                      var arr = [];
                      
                      // osszegyujtjuk a hierarchiaban felettunk levok tartalmat
                      if(this.parentComponent != '') {
                         var p = document.getElementById(this.parentComponent);
                         p.jsObject.putSelection(arr);
	                  }
                      
                      // hozzatesszuk a sajat tartalmunkat
                      arr[this.field] = this.getValue();
                      
                      this.clear();
                      
                      // ezek alapjan lekerjuk a sajat listankat
                      this.retrieveDataFor(arr);
                      
                      // jelzes az alattunk levo boxoknak
					  this.notifyListeners(this.listeners);
					  
                    };
                    
                    publ.onReposition = function() {
                    
                      if(this.parentComponent == '') {

                        // ha mi vagyunk a hierarchia csucsan, akkor..
                        // leterjesztjuk a valodi reposition muveletet, magunkkal kezdve
						this.onParentReposition();                        

                      } else {
                        // egyebkent meg tetlenul varjuk, hogy majd felulrol kezdemenyezzek a repositiont (onParentReposition)
                      }
                    };
                    
                    publ.repositionListeners = function() {
                    	var l = this.listeners.length;
                         for (var i = 0; i < l; i++) {
                           var comp =  this.listeners[i];
                            try {
                              this.listeners[i].onParentReposition();
                            } catch (ex) {
                            }
                         }
                    };
                    
                    publ.onParentReposition = function() {
                    	try {
	                        var fieldName_without_wf = this.field.substring(2, this.field.length);
	                        var value = this.datasource.getField(fieldName_without_wf);
	                        if (value == '') {
	                          this.desiredValue = '';                
	                        } else {
	                          this.desiredValue = value;
	                        }
	                        
	                        if(JSCL.UI.CascadeComponent.bindInProgressCounter > 0) {
	                          // varunk a kotesek befejezodeseig
	                          //window.alert('early reposition.. :-(');
	                          
	                          setTimeout("JSCL.UI.CascadeComponent.repositionCallback('" + this.id + "');", 500);
	                        } else {
	                       		this.repositionListeners();
	                       		
	                       		if(this.parentComponent == '') {
	                       		  // beallitjuk sajat magunk erteket, s ez lefele is elinditja a folyamatot
								  this.onParentChange();
	                       		}
  	                        }
	                       
                      } catch (e) {
                      }
                    };
                    
                    // lista lekerese, parameterkent a sajat es az osszes felettunk allo box tartalma erkezik
                    publ.retrieveDataFor = function(arr) {
                    	var res = [];
                    	
                    	var db = new JSCL.Database.Database();
						db.setData(db.SOURCETYPE.URL, "Command");
						db.setParameter("cmd", "CascadeTextfieldXml");
						db.setParameter("acsl", this.acsl);
						db.setParameter("id", this.id);
						db.setParameter("provId", this.provId);
						db.setParameter("taskInstanceId", this.taskInstanceId);
						db.setParameter("processInstanceId", this.processInstanceId);
						
						// a fuggvenyeket is bejarna az i valtozo, ezert vizsgalunk wf-re
						for(var i in arr) {
						  var t = i.substring(0,2);
						  if(t == "wf") db.setParameter(i, arr[i]);
						}
						
						var errFeloldo = new JSCL.Database.Errors(db);
						ds = new JSCL.Database.Datasource("CascadeTextfield", db);
						ds.name = "Row";
						db.retrieveData();
						
						if (errFeloldo.isError()) {
							var errC = errFeloldo.getCount();
							for (var i = 1; i <= errC; i++) {
								errFeloldo.setPosition(i);
								logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
								alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
							}
						} else {
						  ds.goToFirst();
			  			  this.view.value = '';
						  for(var i = 1; i <= ds.getCount(); i++) {
						    ds.setPosition(i);
						    if(i > 1) this.view.value += ", "; 
						    this.view.value += ds.getField('Text');
						  }
						  if(!this.desiredValue == '') {
							  this.view.value = this.desiredValue;
							  this.desiredValue = '';
						    } 						    
						}
                    };
                  }
                 )
  ;

/* a szulo komponenseknek nincs informaciojuk a gyermekeikrol, csak a gyermek tudja
kezdemenyezni a listener-es kapcsolatteremtest. mivel nem tudjuk milyen sorrendben
peldanyosulnak a komponensek, ezert a CascadeTextfield folyamatosan probalja a szuloelemenel
regisztralni magat. amint a szulo elem is peldanyosult, akkor sikerrel fogunk jarni.
egyeb esetben pedig letiltott allapotban var a komponens. */

JSCL.UI.CascadeTextfield.bindParent = function(parent, child) {

      var p = document.getElementById(parent);
      var c = document.getElementById(child);
    
      if(p) {
        c.jsObject.clear();
        c.jsObject.add(c.jsObject.emptyString, '');
        p.jsObject.addListener(c.jsObject);
        JSCL.UI.CascadeComponent.bindInProgressCounter--;
      } else {
        // window.alert(this.id + ' nem találja a szülö elemét: ' + this.parent);
        // a szülö elem még nem készült el, igy kicsit kesobb ujra probalkozunk
        setTimeout("JSCL.UI.CascadeTextfield.bindParent('" + parent + "','" + child +"');", 500);
      }
};

;
JSCL.UI.PasswordBox =
  JSCL.Lang.Class("JSCL.UI.PasswordBox", JSCL.UI.DBComponent,
                  function(publ, supr) {
                    publ.init = function(id, szulo, f, kotelezo) {
                    
                      this.fArray = f;
                      this._kotelezo = kotelezo;
                      this.calcParent(szulo);
                      this.view = document.createElement("INPUT");
                      this.view.type = "password";
                      this.view.name = id;
                      this.view.id = id;
                      this.parent.appendChild(this.view);
                      
                      if (isUndef(f.typeLabel) == false) {
                        var embDiv = document.createElement("SPAN");
                        embDiv.className = "addedTexts";
                        embDiv.appendChild(document.createTextNode(f.typeLabel));
                        this.parent.appendChild(embDiv);
                      }
                      this.view.maxLength = 150;
                      
                      this.view.size = 30;
                      this.view.style.textAlign = 'left';
                      this.view.jsObject = this;
                      
                      supr(this).init(id, f, kotelezo);
                      
                   	  if(f.hasConfirmPair == 'true') {
                   	    f.hasConfirmPair = 'false';
                   	    this.view.style.cssText = this.view.style.cssText + ';display: block;';
                   	    f.confirmPairId = id;
                   	    this.confirmPair = new JSCL.UI.PasswordBox(id + '_confirmPair', szulo, f, kotelezo);
                   	  } else {
                   	    if(f.confirmPairId) { // ha mi vagyunk valakinek a confirmPair-ja
                   	      this.confirmPair = document.getElementById(f.confirmPairId).jsObject;
                   	    }
                   	  }
                   	
                   	  if(f.acceptRegexp) {
                   	    this.acceptRegexp = f.acceptRegexp;
                   	    if(f.criteriaMsg) {
                   	    	this.criteria = f.criteriaMsg;
                   	    } else {
                   	      this.criteria = f.acceptRegexp;
                   	    }
                   	  } else {
                   	    this.acceptRegexp = '.';
                   	  }
                   	    
                       if (msie) {
                         this.view.onbeforedeactivate.Add(this.validate);                      
                       } else {
                         this.view.onblur.Add(this.validate);                      
                       }
                       
                       this.provId = f.provId;
                    }
                    
                    publ.confirmPair;
                    publ.acceptRegexp;
                    publ.criteria;
                    publ.fArray;
                    publ._kotelezo;
                    
                    publ.validate = function (src, ea) {
                    	
                    	var self = src.jsObject;
                    	var result = false;
                    	var errmsg;
                    	
                    	var egyik = self.getValue();
                    	var masik;
                    	
                    	if(self.confirmPair) {
                    	 masik = self.confirmPair.getValue();
                    	} else {
                    	 masik = egyik;
                    	}
                    	
                    	if(egyik == masik) {
                    	  
                    	  	if(self.acceptRegexp) {
                    	  	  var validator = new RegExp(self.acceptRegexp, "g");
                    	  	  
                    	  	  if(validator.test(egyik)) {
                    	  	    result = true;
                    	  	  } else {
                    	  	    if(egyik.length > 0) {
                    	  	      errmsg = "A jelszó nem felel meg a megfogalmazott feltételnek: " + self.criteria;
                    	  	      result = false;
                    	  	    } else {
                    	  	      result = true;
                    	  	    }
                    	  	  }
                    	  	} else {
                    	  	  result = true; //egyeznek és kész
                    	  	  // az üreset a window paraméterezésénél kell tiltani!
                    	  	}
                    	  	
                    	  } else {
                    	    if(masik.length == 0) {
                    	     result = true;
                    	     //meg a masikat is ki kell töltenie majd..
                    	    } else {
                    	      if(egyik.length > 0) {
                    	        result = false;
                    	        errmsg = "Nem egyezik meg a két beírt jelszó!";
                    	      } else {
                    	        result = false;
                    	        errmsg = "Kérem ismetelje meg a beírt jelszót!";
                    	      }
                    	    }
                    	  }

                        if(!result) {
                        	alert(errmsg);
                   	        self.setValue('');
                    	    self.confirmPair.setValue('');
                        	
                       		//Firefox-ban csak késleltetve mukodik
				            if(!msie) {
				              var tostr = "JSCL.UI.PasswordBox.FocusAndSelect(" + self.id +")";
				              setTimeout(tostr, 50);
				            } else {
				              self.view.focus();
				            }
					            
                        }
                        
                        return result;
                    }
                    
                    publ.getValue = function() {
                      return (this.view.value);
                    }
                    
                    publ.onValidate = function() {
                      this.validate(this.view, null);
                    }
                    
                    publ.onReposition = function() {
                      try {
                        //this.view.value = this.datasource.getField(this.view.field);
                        this.view.value = "";
                      } catch (e) {
                      }
                    }
                  }
                 )
  ;
;

JSCL.UI.PasswordBox.FocusAndSelect = function(target) {
	try {
	  target.focus();
	  target.select();
	} catch (ex) {
	  alert(target + " _ " + ex);
	}
}
JSCL.namespace("JSCL.UI.PopupSearchGrid");

JSCL.UI.PopupSearchGrid = JSCL.Lang.Class("JSCL.UI.PopupSearchGrid", JSCL.UI.Object, function(publ, supr) {
  // engineMap    - a keresõ form részt letöltõ JSCL.Engine.Generator paramétereit tartalmazó closure
  // inFieldMap   - célszerûen az elõzõ ablak "bemenõ" adatokat tartalmazó mezõibõl a keresõ form mezõibe
  //                másoláshoz a mezõk azonosítói srcElem:dstElem párosításban
  // outFieldMap  - kiválasztáskor a ds-bõl az adott mezõk adatait az elõzõ ablak mezõibe másolja
  //                dstElem:fieldName párosításban
  // paramMap     - az adatokat letöltõ JSCL.Database.Database paramétereit tartalmazó closure
  // hideMenu     - menü eltüntetés vezérlése
  // onRowClick   - a gridben egy sorra kattintáskor ez a függvény hívódik. nem kötelezõ megadni.
  publ.init = function(engineMap, inFieldMap, outFieldMap, paramMap, hideMenu, onRowClick) {
    this.outFieldMap = outFieldMap;
    var popupLayer = WWWWWW.tartalom.openLayer();
    if (hideMenu) {
      WWWWWW.menu.displayMenu(false);
    }
    var oEngine = new JSCL.Engine.Generator();
    oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
    oEngine.setMapParameters(engineMap);
    var src = oEngine.generateSrc(popupLayer.id);
    eval(src);
    for ( var n in inFieldMap) {
      var srcElem = document.getElementById(n);
      var dstElem = document.getElementById(inFieldMap[n]);
      dstElem.jsObject.setValue(srcElem.jsObject.getValue());
    }
    this.db = new JSCL.Database.Database();
    this.db.setData(this.db.SOURCETYPE.URL, "Command");
    this.db.setMapParameters(paramMap);
    this.err = new JSCL.Database.Errors(this.db);
    this.ds = new JSCL.Database.Datasource(this.tableName, this.db);
    this.ds.name = this.rowName;
    this.ds.sortField = this.sortColumn;
    this.onRowClickFunction = onRowClick;
    this.paramMap = paramMap;
    this.searchResult();
    this.letolt();
  }
  publ.db;
  publ.ds;
  publ.err;
  publ.outFieldMap;
  publ.paramMap;
  publ.colsArray;
  publ.sortColumn;
  publ.tableName;
  publ.rowName;
  publ.onRowClickFunction;
  publ.formId;
  publ.gridContainerId;
  publ.exit = function() {
    WWWWWW.menu.displayMenu(true);
    WWWWWW.tartalom.closeLayer();
  }
  publ.searchResult = function() {
    this.db.setFormParameters(document.getElementById(this.formId).jsObject, true);
    this.db.retrieveData();
    if (this.err.isError()) {
      var errC = this.err.getCount();
      for (var i = 1; i <= errC; i++) {
        this.err.setPosition(i);
        if (this.err.getCode() == "LIMIT") {
          logger.debug(this.err.getCode() + '-' + this.err.getMessage());
          alert(this.err.getMessage());
        } else {
          logger.debug(this.err.getCode() + '-' + this.err.getMessage());
          alert(this.err.getCode() + '-' + this.err.getMessage());
        }
      }
    }
  }
  publ.letolt = function() {
    try {
      var grid = new JSCL.UI.Tablegrid("gridTable" + this.gridContainerId);
      grid.id = "grid" + this.gridContainerId;
      grid.setData(this.ds);
      grid.height = getGridHeight(0)+"px";
      grid.columnsCount = this.colsArray.length;
      grid.colsArray = this.colsArray;
      grid.columnsHead = function(i) {
        return this.colsArray[i][this.COLUMNS.Head];
      }
      grid.columnsData = function(i) {
        return this.colsArray[i][this.COLUMNS.Data];
      }
      grid.columnsType = function(i) {
        return this.colsArray[i][this.COLUMNS.Type];
      }
      var self = this;
      grid.gazda = this;
      grid.onRowClickFunction = this.onRowClickFunction;
      if(typeof(this.onRowClickFunction) == 'function') {
        grid.onRowClick = this.onRowClickFunctionInvoker;
      } else {
	    grid.onRowClick = function(i) {
	      for (var n in self.outFieldMap) {
	        var elem = document.getElementById(n);
	        elem.jsObject.setValue(self.ds.getField(self.outFieldMap[n]));
	       }
	       self.exit();
	    }
      }
      grid.generate(this.gridContainerId);
    } catch (E) {
      alert(E.message);
    }
  }
  publ.onRowClickFunctionInvoker = function(i) {
    this.onRowClickFunction(i, this.gazda);
  }
});

JSCL.namespace("JSCL.UI.WindowCheat");

JSCL.UI.WindowCheat.ds = null;

JSCL.UI.WindowCheat.getWorkflowStates = function(cbWorkflow, cbStates) {
	var cbWf = document.getElementById(cbWorkflow);
	var cbStates = document.getElementById(cbStates);
	
	if(cbWf.value == "all_processes") {
		cbStates.jsObject.clear();
		cbStates.jsObject.add('- Mind -','mind');
		cbStates.options[0].selected = true
		cbStates.disabled = true;
	} else {
		cbStates.disabled = false;
		var db = new JSCL.Database.Database();
		db.setData(db.SOURCETYPE.URL, "Command");
		db.setParameter("cmd", "GetWorkflowStatesXml");
		db.setParameter("processName", cbWf.value);
			
		var errFeloldo = new JSCL.Database.Errors(db);
		ds = new JSCL.Database.Datasource("WorkflowStates", db);
		ds.name = "Row";
		db.retrieveData();
		
		if (errFeloldo.isError()) {
			var errC = errFeloldo.getCount();
			for (var i = 1; i <= errC; i++) {
				errFeloldo.setPosition(i);
				logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
				alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
			}
		} else {
		  cbStates.disabled = false;
		  cbStates.jsObject.clear();
		  cbStates.jsObject.add('- Mind -','mind');
		  for(var i = 1; i <= ds.getCount(); i++) {
		    ds.setPosition(i);
		    cbStates.jsObject.add(ds.getField('Name'),ds.getField('Value'));
		  }
		}
	}
};

JSCL.UI.WindowCheat.search = function(src, ea) {

    var cbWf = document.getElementById(ea.params.cbWorkflow);
    
    if(cbWf.value == '') {
      window.alert('Nincs kiválasztva a folyamat!');
      return;
    }
	var cbStates = document.getElementById(ea.params.cbState);
	
	var db = new JSCL.Database.Database();
	db.setData(db.SOURCETYPE.URL, "Command");
	db.setParameter("cmd", "FilteredWorkflowsXml");
	db.setParameter("processName", cbWf.value);
	db.setParameter("stateName", cbStates.value);
	db.setParameter("windowId", src.gazda.windowId);
	db.setParameter("procFilter", ea.params.procFilter);
	JSCL.UI.WindowCheat.windowId = src.gazda.windowId;
	for(var f in ea.params.filter) {
	  db.setParameter(f, document.getElementById(f).jsObject.getValue());
	}
	var errFeloldo = new JSCL.Database.Errors(db);
	ds = new JSCL.Database.Datasource("Workflows", db);
	ds.name = "Row";
	db.retrieveData();
	
	try {
	  clearNodeList(ea.params.gridId);
	} catch (t) {
	  logger.debug(t);
	}
	JSCL.UI.WindowCheat.prepareGrid(ea.params.gridId, ea.params.columCount, ea.params.oszlopok, ds, ea);
};

JSCL.UI.WindowCheat.prepareGrid = function (gridContainerId, columCount, oszlopok, ds, ea) {
	var grid = new JSCL.UI.Tablegrid("gridTable" +gridContainerId);
    grid.id = "grid" + gridContainerId;
      grid.setData(ds);
      grid.height = getGridHeight(0)+"px";
      grid.columnsCount = columCount;
      var os = "grid.colsArray = " + decode64(oszlopok) + ";";
      eval(os);
      //grid.colsArray = oszlopok;
      grid.columnsHead = function(i) {
        return this.colsArray[i][this.COLUMNS.Head];
      }
      grid.columnsData = function(i) {
        return this.colsArray[i][this.COLUMNS.Data];
      }
      grid.columnsType = function(i) {
        return this.colsArray[i][this.COLUMNS.Type];
      }
      grid.gazda = this;
      
      grid.onRowClick = JSCL.UI.WindowCheat.onRowClickFunction;
      grid.eaf = ea;
      grid.generate(gridContainerId);
};

JSCL.UI.WindowCheat.onRowClickFunction = function() {
  try {
    clearNodeList(document.getElementById(this.eaf.params.cheatDiv));
    var cd = document.getElementById('CheatForm');
    if(cd != null) {
	  cd.parentNode.removeChild(cd);
	} else {
	  logger.debug('CD is null!');
	}
  } catch (t) {
	logger.debug(t);
  }

  var oEngine = new JSCL.Engine.Generator();
  oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
  oEngine.setParameter("cmd", "CheatZoneRF");
  oEngine.setParameter("processInstanceId", this.datasource.getField("ProcessInstanceId"));
  oEngine.setParameter("cheatDivParam", this.eaf.params.cheatDiv);
  oEngine.generate(this.eaf.params.cheatDiv);

};

JSCL.UI.WindowCheat.doStep = function(pid, combo, btn, cheatDiv, megj) {
  var btn = document.getElementById(btn);
  var trans = document.getElementById(combo).value;
  var db = new JSCL.Database.Database();
  db.setData(db.SOURCETYPE.URL, "Command");
  db.setParameter("cmd", "WindowCheatXml");
  db.setParameter("type", "step");
  db.setParameter("trans", trans);
  db.setParameter("pid", pid);
  db.setParameter("windowId", JSCL.UI.WindowCheat.windowId);
  db.setParameter("megjegyzes", document.getElementById(megj).value);
  var errFeloldo = new JSCL.Database.Errors(db);
  ds = new JSCL.Database.Datasource("Result", db);
  ds.name = "Message";
  db.retrieveData();
  if (errFeloldo.isError()) {
		var errC = errFeloldo.getCount();
		for (var i = 1; i <= errC; i++) {
			errFeloldo.setPosition(i);
			logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
			alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
		}
	} else {
	  window.alert('OK');
	  	document.getElementById(cheatDiv).removeChild(document.getElementById('CheatForm'));
	    var oEngine = new JSCL.Engine.Generator();
		  oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
		  oEngine.setParameter("cmd", "CheatZoneRF");
		  oEngine.setParameter("processInstanceId", pid);
		  oEngine.setParameter("cheatDivParam", cheatDiv);
		  oEngine.generate(cheatDiv);
	}
};

JSCL.UI.WindowCheat.doJump = function(pid, combo, btn, cheatDiv, megj) {
  var btn = document.getElementById(btn);
  var jump = document.getElementById(combo).value;
  var db = new JSCL.Database.Database();
  db.setData(db.SOURCETYPE.URL, "Command");
  db.setParameter("cmd", "WindowCheatXml");
  db.setParameter("type", "jump");
  db.setParameter("pid", pid);
  db.setParameter("jump", jump);
  db.setParameter("windowId", JSCL.UI.WindowCheat.windowId);
  db.setParameter("megjegyzes", document.getElementById(megj).value);
  var errFeloldo = new JSCL.Database.Errors(db);
  ds = new JSCL.Database.Datasource("Result", db);
  ds.name = "Message";
  db.retrieveData();
    if (errFeloldo.isError()) {
		var errC = errFeloldo.getCount();
		for (var i = 1; i <= errC; i++) {
			errFeloldo.setPosition(i);
			logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
			alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
		}
	} else {
	  window.alert('OK');
	  document.getElementById(cheatDiv).removeChild(document.getElementById('CheatForm'));
	    var oEngine = new JSCL.Engine.Generator();
		  oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
		  oEngine.setParameter("cmd", "CheatZoneRF");
		  oEngine.setParameter("processInstanceId", pid);
		  oEngine.setParameter("cheatDivParam", cheatDiv);
		  oEngine.generate(cheatDiv);
	}
};
JSCL.namespace("WWWWWW");

/** Action hivasanak kezdemenyezese JS iranyabol */
WWWWWW.invokeAction = function(taskInstanceId, processInstanceId, provIds, action, actionParam, successKey, successMsg, isAlertOnSucc, alertMsgOnSucc) {
  var db = new JSCL.Database.Database();
  db.setData(db.SOURCETYPE.URL, "Command");
  db.setParameter("cmd", "ActionXml");
  var ds = new JSCL.Database.Datasource("ActionResult", db);
  ds.name = "Result";
  var err = new JSCL.Database.Errors(db);
  db.setParameter("taskInstanceId", taskInstanceId);
  db.setParameter("processInstanceId", processInstanceId);
  db.setParameter("provIds", provIds);
  db.setParameter("action", action);
  db.setParameter("actionParam", actionParam);
  db.setParameter("successKey", successKey);
  db.setParameter("successMsg", successMsg);
  db.retrieveData();
  if (err.isError()) {
    throw new JSCL.Lang.Exception(err);
  } else {
    ds.goToFirst();
    var resultMsg = ds.getField('Message');
    if(resultMsg == "OK") { /* successMsg megtalalva */
      if(isAlertOnSucc) {
        window.alert(alertMsgOnSucc);
      }
      return true;
    } else {
      window.alert(resultMsg);
      return false;
    }
  }
}

/** Komponens tartalmanak lekerese JS iranyabol */

WWWWWW.getWindowData = function(windowId, fieldName) {
	var candidate = document.getElementById(fieldName + windowId);
	if(candidate == null) {
		candidate = document.getElementById(fieldName);
	}
	if(candidate != null) {
		if(candidate.jsObject) {
			return candidate.jsObject.getValue();
		} else {
			return candidate.value;
		}
	} else {
		window.alert("Nem sikerult adatot talalni: windowId = " + windowId + ", fieldName = " + fieldName);
		return null;
	}
}

WWWWWW.setVariables = function(provider, vars, taskInstanceId, processInstanceId) {
	 var db = new JSCL.Database.Database();
	 db.setData(db.SOURCETYPE.URL, "Command");
	 db.setParameter("cmd", "SetVariablesXml");
	 db.setParameter("taskInstanceId", taskInstanceId);
	 db.setParameter("processInstanceId", processInstanceId);
	 db.setParameter("provId", provider);
	 for(var key in vars) {
		 db.setParameter("var_" + key, vars[key]);
	 }
	 db.retrieveData();
}

WWWWWW.getSorszam = function(sorszam) {
	var db = new JSCL.Database.Database();
	db.setData(db.SOURCETYPE.URL, "Command");
	db.setParameter("cmd", "GetSorszamXml");
	db.setParameter("sorszam", sorszam);
	var ds = new JSCL.Database.Datasource("SorszamResult", db);
	var err = new JSCL.Database.Errors(db);
	ds.name = "Result";
	db.retrieveData();
	if (err.isError()) {
	    throw new JSCL.Lang.Exception(err);
	  } else {
	    ds.goToFirst();
	    var resultMsg = ds.getField('Value');
	    return resultMsg;
	}
}

WWWWWW.regiLakUgyletInditas = function() {
	/* athozva a Ring.UgyletInditas.js-bol */
	  document.getElementById("eAdosNev").necessity = '3';
	  addAttribute(document.getElementById("eAdosNev"), 'necessity', '3');
	  dbUgy = new JSCL.Database.Database();
	  dbUgy.setData(dbUgy.SOURCETYPE.URL, "Command");
	  errUgy = new JSCL.Database.Errors(dbUgy);
	  dsUgy = new JSCL.Database.Datasource("Ugylet", dbUgy);
	  dsUgy.name = "Row";
	  if (dsKond.getCount() > 1) {
	    var kondLista = document.getElementById("eKond");
	  	if (kondLista.jsObject.getValue() == '') {
		    alert("Kötelezõ választani a kondíciós feltételek közül!");
	  	  return;
	  	}
	  }
	  dbUgy.setFormParameters(document.getElementById('UgyletInditasForm').jsObject, true);
	  dbUgy.setParameter("cmd", "UgyletInditasMentesXml");
	  dbUgy.setParameter('termekId', dsUI.getField('TermekId'));
	  dbUgy.setParameter('wftId', dsUI.getField('wftId'));
	  dbUgy.setParameter('aktualisFiokKod', Ring.fiokKod);
	  var vezetoTermek = (dsUI.getField('VezetoTermek') == 'I');
	  if (vezetoTermek) {
	    dbUgy.setParameter('vezetoTermek', 'I');
	    dbUgy.setParameter('KtermekId', dsKUI.getField('TermekId'));
	    dbUgy.setParameter('KwftId', dsKUI.getField('wftId'));
	  } else {
	    dbUgy.setParameter('vezetoTermek', 'N');
	  }
	  dbUgy.retrieveData();
	  if (errUgy.isError()) {
	    var errC = errUgy.getCount();
	    for (var i = 1; i <= errC; i++) {
	      errUgy.setPosition(i);
	      logger.debug(errUgy.getCode()+'-'+errUgy.getMessage());
	      alert(errUgy.getCode()+'-'+errUgy.getMessage());
	    }
	  } else {
	    dsUgy.setPosition(1);
	    Ring.Workflow.main(dsUgy.getField('LoanId'), dsUgy.getField('Felulet'));
	  }
	var loanId = 1;
	var felulet = 'S';
	/* */
	Ring.Workflow.main(loanId, felulet)
}
JSCL.namespace("WWWWWW.Messages");

WWWWWW.Messages.Clock_start = "WWWWWW.Messages.Clock.start";
WWWWWW.Messages.Clock_stop = "WWWWWW.Messages.Clock.stop";
JSCL.namespace("WWWWWW");

WWWWWW.Tartalom = JSCL.Lang.Class("WWWWWW.Tartalom", JSCL.Application.Base,
    function(publ, supr) {
      publ.init = function(id, elem) {
        supr(this).init(id);
        if (typeof elem == 'string') {
          this.tartalomFrame = document.getElementById(elem);
        } else {
          this.tartalomFrame = elem;
        }
        this.divStack = [];
      }
      publ.tartalomFrame;
      publ.divStack;
          
      publ.ClearTartalomFrame = function() {
        clearNodeList(this.tartalomFrame);
        this.tartalomFrame.innerText = "";
        this.divStack = [];
      }
      
      publ.displayTartalom = function(disp) {
        this.tartalomFrame.style.display = (disp) ? "inline" : "none";
      }
      
      publ.AddToTartalom = function(elem, id) {
        // ne használjuk
        var node = document.createElement(elem);
        node.id = id;
        node.name = id;
        this.tartalomFrame.appendChild(node);
      }
      
      publ.openLayer = function() {
        var id = this.getTmpName();
        var node = document.createElement("DIV");
        node.id = id;
        node.name = id;
        if (this.divStack.length > 0) {
          this.divStack[this.divStack.length - 1].style.display = "none";
        }
        this.tartalomFrame.appendChild(node);
        this.divStack.push(node);
        return (node);
      }
      
      publ.closeLayer = function() {
        if (this.divStack.length > 0) {
          var node = this.divStack.pop();
          try {
            clearNodeList(node);
            node.innerText = "";
            node.parentNode.removeChild(node);
          } catch (e) {
            logger.debug(e);
          }
          if (this.divStack.length > 0) {
            try {
              this.divStack[this.divStack.length - 1].style.display = "inline";
            } catch (e) {
              logger.debug(e);
            }
          }
        } else {
          throw (new JSCL.Lang.Exception("DivStack underflow."));
        }
      }
      
      publ.closeAllLayer = function() {
        var l = this.divStack.length;
        for (var j = 0; j < l; j++) {
          this.closeLayer();
        }
        this.ClearTartalomFrame();
      }
      publ.closeToLayer = function(n) {
        var l = this.divStack.length-n;
        for (var j = 0; j < l; j++) {
          this.closeLayer();
        }
        if(n == 0) {
        	this.ClearTartalomFrame();
        }
      }
      publ.getTopLayer = function() {
        if (this.divStack.length > 0) {
          return (this.divStack[this.divStack.length - 1]);
        } else {
          throw (new JSCL.Lang.Exception("DivStack underflow."));
        }
      }
      publ.getTmpName = function() {
        var now = new Date();
        var seed = now.getSeconds();
        var random_number = Math.random(seed);
        var range = random_number * 1000000;
        var rounded_number = Math.round(range);
        if (rounded_number == 1000000) {
          rounded_number = 0;
        }
        var quote = rounded_number;
        return ("JSCL.Tartalom.tmp" + quote);
      }
    });;
JSCL.namespace("WWWWWW");

WWWWWW.Menu = JSCL.Lang.Class("WWWWWW.Menu", JSCL.Application.Base, function(
    publ, supr) {
  publ.init = function() {
    supr(this).init(null);
//    this.ejrSystem = ejrSystem;
//    this.ejrApplication = ejrApplication;
    this.menuFrame = document.getElementById("MenuFrame");
  }
  publ.menuFrame;
  publ.ejrSystem;
  publ.ejrApplication;
  publ.ClearMenuFrame = function() {
    clearNodeList(this.menuFrame);
    this.menuFrame.innerText = "";
  }
  publ.displayMenu = function(disp) {
    this.menuFrame.style.display = (disp) ? "inline" : "none";
  }
  publ.FoMenuDL = function() {
    this.ClearMenuFrame();
    var oEngine = new JSCL.Engine.Generator();
    oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
    oEngine.setParameter("cmd", "GeneralRF");
    oEngine.setParameter("action", "FoMenuRF");
    oEngine.generate("MenuFrame");
    this.setMenuDisplay(true);
    WWWWWW.info.InfoDL();
  }
  publ.setMenuDisplay = function(state) {
    if (state) {
      this.menuFrame.style.display = 'block';
    } else {
      this.menuFrame.style.display = 'none';
    }
  }
  publ.MenuDisplayOnOff = function() {
    if (this.menuFrame.style.display == 'none') {
      this.menuFrame.style.display = 'block';
    } else {
      this.menuFrame.style.display = 'none';
    }
  }
  publ.disableChangeSysApp = function(bDisable) {
  }
  publ.MenuDL = function(fomenu, ejrSystem, ejrApplication) {
    this.disableChangeSysApp(fomenu == false);
    this.ejrSystem = ejrSystem;
    this.ejrApplication = ejrApplication;
    this.ClearMenuFrame();
    var oEngine = new JSCL.Engine.Generator();
    oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
    if (fomenu) {
      oEngine.setParameter("cmd", "FoMenuRF");
      oEngine.setParameter("ejrSystem", this.ejrSystem);
      oEngine.setParameter("ejrApplication", this.ejrApplication);
    } else {
      oEngine.setParameter("cmd", "MenuRF");
    }
    oEngine.generate("MenuFrame");
    this.setMenuDisplay(true);
    if (fomenu == false) {
      WWWWWW.info.InfoDL();
    }
  }
  publ.MenuWindow = function(winId) {
    // this.disableChangeSysApp(true);
  	var tomb = [];
  	var provId = "MenuParams";
  	var oForm = new WWWWWW.FormGen(winId, tomb, 0, 0, provId);
  }
});;
JSCL.namespace("WWWWWW");

WWWWWW.User = JSCL.Lang
		.Class(
				"WWWWWW.User",
				JSCL.Application.Base,
				function(publ, supr) {
					publ.init = function(id) {
						supr(this).init(id);
						this.userFrame = document.getElementById("UserFrame");
					}
					publ.userFrame;
					publ.webUser;
					publ.changeDisabled;
					publ.ClearUserFrame = function() {
						clearNodeList(this.userFrame);
						this.userFrame.innerText = "";
					}
					publ.changeSys = function(eSysElementId, eAppElementId) {
						if (this.changeDisabled == false) {
							try {
								var sysId = document
										.getElementById(eSysElementId).jsObject
										.getValue();
								var dbAppl = new JSCL.Database.Database();
								dbAppl
										.setData(dbAppl.SOURCETYPE.URL,
												"Command");
								dbAppl.setParameter("cmd", "SysApplXml");
								dbAppl.setParameter("rendszer", sysId);
								var dsAppl = new JSCL.Database.Datasource(
										"Alkalmazas", dbAppl);
								dsAppl.name = "Row";
								var errAppl = new JSCL.Database.Errors(dbAppl);
								dbAppl.retrieveData();
								if (errAppl.isError()) {
									var errC = errAppl.getCount();
									for ( var i = 1; i <= errC; i++) {
										errAppl.setPosition(i);
										alert(errAppl.getCode() + '-'
												+ errAppl.getMessage());
									}
								} else {
									var applElement = document
											.getElementById(eAppElementId).jsObject;
									applElement.clear();
									var dsC = dsAppl.getCount();
									for ( var i = 1; i <= dsC; i++) {
										dsAppl.setPosition(i);
										applElement.add(dsAppl.getField("Megjegyzes"), dsAppl.getField("Alkalmazas"));
									}
								}
							} catch (e) {
								logger.debug(e.message);
							}
						}
					}
					publ.changeSysApp = function(m6instance, eSysElementId, eAppElementId) {
						if (this.changeDisabled == false) {
							var sysId = document.getElementById(eSysElementId).jsObject
									.getValue();
							var applId = document.getElementById(eAppElementId).jsObject
									.getValue();
							var targetWindow = '_self';
							var params = 'status=yes,titlebar=yes,menubar=no,location=no,scrollbars=yes,resizable=yes,toolbar=no,left=0,top=0,fullscreen=no';
							params = params + ',height=' + screen.availHeight;
							params = params + ',width=' + screen.availWidth;
							window.open('Command?cmd=' + m6instance + '&width='
									+ screen.availWidth + '&height='
									+ screen.availHeight + '&ejrSystem='
									+ sysId + '&ejrApplication=' + applId,
									targetWindow, params);
						}

					}
					publ.disableChangeSysApp = function(bDisable) {
						this.changeDisabled = bDisable;
						try {
							var eChangeSys = document
									.getElementById("user.eChangeSys").jsObject;
							var eChangeApp = document
									.getElementById("user.eChangeApp").jsObject;
							var bChangeSysApp = document
									.getElementById("user.bChangeSysApp").jsObject;
							eChangeSys.view.disabled = bDisable;
							eChangeApp.view.disabled = bDisable;
							bChangeSysApp.view.disabled = bDisable;
						} catch (e) {
						}
					}
					publ.UserDL = function(ejrSystem, ejrApplication) {
						this.ClearUserFrame();
						var oEngine = new JSCL.Engine.Generator();
						oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
						/* Ring eseten postai usernel mas RF Command kell */
						oEngine.setParameter("cmd", (window.postaiFelulet == "I") ? "PUserRF" : "UserRF");
						oEngine.setParameter("ejrSystem", ejrSystem);
						oEngine.setParameter("ejrApplication", ejrApplication);
						oEngine.generate("UserFrame");
						this.webUser = document.getElementById("user.webUser").jsObject
								.getValue();
						this.changeDisabled = false;
					}
				});;
JSCL.namespace("WWWWWW");

WWWWWW.Info = JSCL.Lang.Class("WWWWWW.Info", JSCL.Application.Base, function(
    publ, supr) {
  publ.init = function(id) {
    supr(this).init(id);
    this.InfoFrame = document.getElementById("InfoFrame");
  }
  publ.InfoFrame;
  publ.InfoFrameDiv;
  publ.ClearInfoFrame = function() {
    clearNodeList(this.InfoFrame);
    this.InfoFrame.innerText = "";
  }
  publ.ClearInfoFrameDiv = function() {
    clearNodeList(this.InfoFrameDiv);
    this.InfoFrameDiv.innerText = "";
  }
  publ.InfoDL = function(winId, taskInstanceId, parameters, processInstanceId) {
    this.ClearInfoFrame();
    var oEngine = new JSCL.Engine.Generator();
    oEngine.setData(oEngine.SOURCETYPE.EMBEDDED, "InfoIsland");
    oEngine.generate("InfoFrame");
    this.InfoFrameDiv = document.getElementById("InfoDiv");
    this.ClearInfoFrameDiv();
    // var oEngine = new JSCL.Engine.Generator();
    var oEngine = new JSCL.Net.Html();
    oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
    oEngine.setParameter("cmd", "InfoPanelHtml");
    oEngine.setParameter("windowId", winId);
    oEngine.setParameter("taskInstanceId", taskInstanceId);
    if(processInstanceId) {
    	oEngine.setParameter("processInstanceId", processInstanceId);
    }
    oEngine.setParameter("provId", "JBPMTask");
    if (parameters != null) {
      oEngine.setParameters(parameters);
    }
    // oEngine.generate("InfoFrame");
    oEngine.retrieveData();
    this.InfoFrameDiv.innerHTML = oEngine.html;
  }
});;
JSCL.namespace("WWWWWW");

WWWWWW.Bulletin = JSCL.Lang.Class("WWWWWW.Bulletin", JSCL.Application.Base,
    function(publ, supr) {
      publ.init = function(id) {
        supr(this).init(id);
      }
      publ.BulletinDL = function() {
        try {
          var bulletinsDiv = WWWWWW.tartalom.openLayer();
          var oEngine = new JSCL.Engine.Generator();
          oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
          oEngine.setParameter("cmd", "BulletinRF");
          oEngine.generate(bulletinsDiv.id);
          var dbBulletins = new JSCL.Database.Database();
          dbBulletins.setData(dbBulletins.SOURCETYPE.URL, "Command");
          dbBulletins.setParameter("cmd", "BulletinsXml");
          var dsBulletins = new JSCL.Database.Datasource("Bulletins",
              dbBulletins);
          dsBulletins.name = "Bulletin";
          var errBulletins = new JSCL.Database.Errors(dbBulletins);
          dbBulletins.retrieveData();
          if (errBulletins.isError()) {
            var errC = errBulletins.getCount();
            for (var i = 1; i <= errC; i++) {
              errBulletins.setPosition(i);
              alert(errBulletins.getCode() + '-'
                  + errBulletins.getMessage());
            }
          } else {
            var dsC = dsBulletins.getCount();
            var szulo = document.getElementById("BulletinsDiv");
            for (var i = 1; i <= dsC; i++) {
              dsBulletins.setPosition(i);
              szulo.innerHTML = szulo.innerHTML
                  + dsBulletins.getField("Uzenet") + "<HR>";
            }
          }
        } catch (e) {
          alert(e.message);
        }
      }
    });;
JSCL.namespace("WWWWWW");

WWWWWW.FormGen = JSCL.Lang
    .Class(
        "WWWWWW.FormGen",
        JSCL.Application.Base,
        function(publ, supr) {
          var self = this;
          publ.init = function(winId, filterData, callerWindowId,
              taskInstanceId, provId, dataCtx, processInstanceId /*optional*/) {
            supr(this).init(null);
            this.windowId = winId;
            this.objuid = _objuid++;
            this.taskInstanceId = taskInstanceId;
            this.processInstanceId = processInstanceId;
            this.filterData = filterData;
            this.callerWindowId = callerWindowId;
            this.provId = provId;
            this.dataCtx = dataCtx;
            this.gridClickHandlerFnc = null;
            if (isUndef(this.provId)) {
              this.provId = "JBPM";
            }
            this.dataId = null;
            this.dbWF = new JSCL.Database.Database();
            this.dbWF.setData(this.dbWF.SOURCETYPE.URL, "Command");
            this.dbWF.setParameter("cmd", "FormGenDataXml");
            this.dbWF.setParameter("provId", this.provId + "Proc");
            this.errWF = new JSCL.Database.Errors(this.dbWF);
            this.dsWF = new JSCL.Database.Datasource("Workflow",
                this.dbWF);
            this.dsWF.name = "Row";
            this.dsClientWF = new JSCL.Database.Datasource(
                "Client", this.dbWF);
            this.dsClientWF.name = "Row";
            this.dsRecLimitWF = new JSCL.Database.Datasource(
                "RecLimit", this.dbWF);
            this.dsRecLimitWF.name = "Row";
            this.dsSearchWF = new JSCL.Database.Datasource(
                "SearchParams", this.dbWF);
            this.dsSearchWF.name = "Row";
            this.dataType = '';
            this.formDiv = WWWWWW.tartalom.openLayer();
            this.dsWF.clearListeners();
            this.dsWF.setFilter(null);
            this.dsSearchWF.clearListeners();
            this.dsSearchWF.setFilter(null);
            var self = this;
            var oEngine = new JSCL.Engine.Command("FormGenFormXml");
            oEngine.cacheType = oEngine.CACHETYPE.WINDOWID;
            oEngine.setParameter("windowId", this.windowId);
            oEngine.setParameter("taskInstanceId",this.taskInstanceId);
            oEngine.setParameter("processInstanceId", this.processInstanceId);
            oEngine.setParameter("provId", this.provId + "Proc");
            oEngine.setParameters(this.filterData);
            var src = oEngine.generateSrc(this.formDiv.id);
            eval(src);
            if (parseInt(this.windowId, 10) >= 0) {
              if (this.mustInsert) {
                this.onlyInsertNewRecord();
              }
              if (this.windowType != '1'
                  && this.windowType != '5'
                  && this.windowType != '6'
                  && this.windowType != '7'
                  && this.windowType != '105'
                  && this.windowType != '13'
                  && this.windowType != '14'
                  && this.windowType != '15'
                  && this.windowNeedsData) {
                this.dbWF.setParameter("windowId", this.windowId);
                this.dbWF.setParameter("provId", this.provId + "Proc");
                this.dbWF.setParameter("taskInstanceId", this.taskInstanceId);
                if(this.processInstanceId) {
                  this.dbWF.setParameter("processInstanceId", this.processInstanceId);
                }
                this.dbWF.setParameters(this.filterData);
                this.dbWF.setParameter("notSkip", "1");
                this.dbWF.retrieveData();
                if (this.errWF.isError()) {
                  var errC = this.errWF.getCount();
                  for ( var i = 1; i <= errC; i++) {
                    this.errWF.setPosition(i);
                    logger.debug(this.errWF.getCode() + '-'
                        + this.errWF.getMessage());
                    alert(this.errWF.getCode() + '-'
                        + this.errWF.getMessage());
                  }
                } else {
                  this.dsWF.goToFirst();
                  this.kulcsmezo = this.dsWF.getField('workflowKulcsmezo');
                  this.dataId = this.dsWF.getField(this.kulcsmezo);
                  this.dsSearchWF.goToFirst();
                }
              } else {
                if (this.windowType == '7') {
                  // this.dsWF.goToFirst();
                  this.grid.selectRow(0);
                  try {
                	  this.dataId = this.dsWF.getField(this.dsWF.getField("workflowKulcsmezo"));
                  } catch (e) {
                	  this.dataId = null;
                	  window.alert('Hiba a dsWF dataId beallitasakor');
                  }
                }
              }
            }
            WWWWWW.info.InfoDL(winId, taskInstanceId, filterData);
          }

          publ.filterData;
          publ.dbWF;
          publ.errWF;
          publ.dsWF;
          publ.dsClientWF;
          publ.dsSearchWF;
          publ.dataType;
          publ.formDiv;
          publ.grid;
          publ.dataCtx;
          publ.windowNeedsData = true;
          publ.hasNavigator = false;
          publ.nextId;
          publ.prevId;
          publ.Buttons = function(id, szulo, f, beforeSaveScript, afterSaveScript, prevId, nextId) {
              this.afterSaveScript64 = afterSaveScript;
	    	  var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
	    		  border : "0",
	    		  width : "100%"
	    	  });
	    	  var IDAYXWJC = new JSCL.UI.Generic('tbody',
	    			  IDAUXWJC.content, {});
	    	  var IDAXXWJC = new JSCL.UI.Generic('tr',
	    			  IDAYXWJC.content, {});
	    	  this.buttonWrapperTR = IDAXXWJC;
        	  this.nextId = nextId;
        	  this.prevId = prevId;
        	  
            if (f.tiltott.indexOf('BACK') < 0 && prevId != 0) {
                var tdPrev = new JSCL.UI.Generic('td',
              		  this.buttonWrapperTR.content, {
                      align : "center"
                    });
                var bBack = new JSCL.UI.Button("wf.bBack"
                    + this.windowId, tdPrev.content, {
                  id : "wf.bBack" + this.windowId,
                  caption : f.btntext['BACK'] || "Hátra",
                  style_width : "55px"
                }, '');
                bBack.view.gazda = this;
                bBack.view.onclick.Add( function(src, ea) {
                  src.gazda.prevEvent();
                });
              }
            
            if (f.tiltott.indexOf('CANCEL') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              var bCancel = new JSCL.UI.Button("wf.bCancel"
                  + this.windowId, IDA0XWJC.content, {
                id : "wf.bCancel" + this.windowId,
                caption : f.btntext['CANCEL'] || "Vissza",
                style_width : "55px"
              }, '');
              bCancel.view.gazda = this;
              bCancel.view.onclick.Add( function(src, ea) {
                src.gazda.cancelEvent();
              });
            }
            if (f.tiltott.indexOf('AGAIN') < 0) {
              var IDADXWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bAgain = new JSCL.UI.Button("wf.bAgain"
                  + this.windowId, IDADXWJC.content, {
                id : "wf.bAgain" + this.windowId,
                caption : f.btntext['AGAIN'] || "Újra",
                style_width : "55px"
              }, '');
              bAgain.view.gazda = this;
              bAgain.view.onclick.Add( function(src, ea) {
                src.gazda.againEvent();
              });
            }
            if (f.tiltott.indexOf('SAVE') < 0) {
              var IDADWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bSave = new JSCL.UI.Button("wf.bSave"
                  + this.windowId, IDADWWJC.content, {
                id : "wf.bSave" + this.windowId,
                caption : f.btntext['SAVE'] || "Mentés",
                style_width : "55px"
              }, '');
              bSave.view.gazda = this;
              if(!beforeSaveScript) {
            	  bSave.view.onclick.Add( function(src, ea) {
            		  src.gazda.saveEvent();
            	  });
              } else {
            	  var beforeSaveconditionFunction = decode64(beforeSaveScript);
            	  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.saveEvent();");
            	  bSave.view.onclick.Add(beforeSaveFunction);
              }
            }
            if (f.tiltott.indexOf('OK') < 0) {
              var IDAXWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
                  IDAXWWJC.content, {
                    id : "wf.bOK" + this.windowId,
                    caption : f.btntext['OK']
                        || "Mentés és vissza",
                    style_width : "105px"
                  }, '');
              bOK.view.gazda = this;
              if(!beforeSaveScript) {
            	  bOK.view.onclick.Add( function(src, ea) {
            		  src.gazda.okEvent();
            	  });
              } else {
            	  var beforeSaveconditionFunction = decode64(beforeSaveScript);
            	  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.okEvent();");
            	  bOK.view.onclick.Add(beforeSaveFunction);
              }
            }
            
            if (f.tiltott.indexOf('NEXT') < 0 && nextId != 0) {
              var tdNext = new JSCL.UI.Generic('td',
            		  this.buttonWrapperTR.content, {
                    align : "center"
                  });
              var bNext = new JSCL.UI.Button("wf.bNext"
                  + this.windowId, tdNext.content, {
                id : "wf.bNext" + this.windowId,
                caption : f.btntext['NEXT'] || "Elõre",
                style_width : "55px"
              }, '');
              bNext.view.gazda = this;
              bNext.view.onclick.Add( function(src, ea) {
                src.gazda.nextEvent();
              });
            }
          }
          publ.ButtonNext = function(tiltott, btntext, nextid) {
	          
          }
          publ.ButtonPrev = function(tiltott, btntext, previd) {

          }
          publ.Buttons30 = function(id, szulo, f) {
            logger.debug("Tiltott gombok: " + f.tiltott);
            var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
              border : "0",
              width : "100%"
            });
            var IDAYXWJC = new JSCL.UI.Generic('tbody',
                IDAUXWJC.content, {});
            var IDAXXWJC = new JSCL.UI.Generic('tr',
                IDAYXWJC.content, {});
            if (f.tiltott.indexOf('CANCEL') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              var bCancel = new JSCL.UI.Button("wf.bCancel"
                  + this.windowId, IDA0XWJC.content, {
                id : "wf.bCancel" + this.windowId,
                caption : f.btntext['CANCEL'] || "Vissza",
                style_width : "55px"
              }, '');
              bCancel.view.gazda = this;
              bCancel.view.onclick.Add( function(src, ea) {
                src.gazda.cancelEvent();
              });
            }
            if (f.tiltott.indexOf('OK') < 0) {
              // var okCaption = (this.nextId == 'jbpm')
              var okCaption = "Mentés és vissza";
              var IDAXWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
                  IDAXWWJC.content, {
                    id : "wf.bOK" + this.windowId,
                    caption : f.btntext['OK'] || okCaption,
                    style_width : "105px"
                  }, '');
              bOK.view.gazda = this;
              // if (this.nextId == 'jbpm') {
              bOK.view.onclick.Add( function(src, ea) {
                src.gazda.ok30Event();
              });
              // } else {
              // bOK.view.onclick.Add(function(src, ea) {
              // src.gazda.gridOkEvent();
              // });
              // }
            }
          }
          publ.Buttons7 = function(id, szulo, f, beforeSaveScript, afterSaveScript, newScript) {
        	this.afterSaveScript64 = afterSaveScript;
            logger.debug("Tiltott gombok: " + f.tiltott);
            var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
              border : "0",
              width : "100%"
            });
            var IDAYXWJC = new JSCL.UI.Generic('tbody',
                IDAUXWJC.content, {});
            var IDAXXWJC = new JSCL.UI.Generic('tr',
                IDAYXWJC.content, {});
            if (f.tiltott.indexOf('CANCEL') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              var bCancel = new JSCL.UI.Button("wf.bCancel"
                  + this.windowId, IDA0XWJC.content, {
                id : "wf.bCancel" + this.windowId,
                caption : f.btntext['CANCEL'] || "Vissza",
                style_width : "55px"
              }, '');
              bCancel.view.gazda = this;
              bCancel.view.onclick.Add( function(src, ea) {
                src.gazda.cancel7Event();
              });
            }
            if (f.tiltott.indexOf('NEW') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bNew = new JSCL.UI.Button(
                  "wf.bNew" + this.windowId,
                  IDA0XWJC.content, {
                    id : "wf.bNew" + this.windowId,
                    caption : f.btntext['NEW'] || "Új",
                    style_width : "55px"
                  }, '');
              bNew.view.gazda = this;
              if(!newScript) {
            	  bNew.view.onclick.Add( function(src, ea) {
            		  src.gazda.new7Event();
            	  });
              } else {
            	  var conditionFunction = decode64(newScript);
            	  var newFunction = new Function("src", "ea", conditionFunction + ";src.gazda.new7Event();");
            	  bNew.view.onclick.Add(newFunction); 
              }
            }
            if (f.tiltott.indexOf('DEL') < 0) {
              var IDADWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bDel = new JSCL.UI.Button(
                  "wf.bDel" + this.windowId,
                  IDADWWJC.content, {
                    id : "wf.bDel" + this.windowId,
                    caption : f.btntext['DEL'] || "Törlés",
                    style_width : "55px"
                  }, '');
              bDel.view.gazda = this;
              bDel.view.onclick.Add( function(src, ea) {
                src.gazda.delete7Event();
              });
            }
            if (f.tiltott.indexOf('SAVE') < 0) {
              var IDADWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bSave = new JSCL.UI.Button("wf.bSave"
                  + this.windowId, IDADWWJC.content, {
                id : "wf.bSave" + this.windowId,
                caption : f.btntext['SAVE'] || "Mentés",
                style_width : "55px"
              }, '');
              bSave.view.gazda = this;
              if(!beforeSaveScript) {
            	  bSave.view.onclick.Add( function(src, ea) {
            		  src.gazda.save7Event();
            	  });
              } else {
            	  var beforeSaveconditionFunction = decode64(beforeSaveScript);
            	  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.save7Event();");
            	  bSave.view.onclick.Add(beforeSaveFunction);
              }
            }
            if (f.tiltott.indexOf('OK') < 0) {
              var IDAXWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
                  IDAXWWJC.content, {
                    id : "wf.bOK" + this.windowId,
                    caption : f.btntext['OK']
                        || "Mentés és vissza",
                    style_width : "55px"
                  }, '');
              bOK.view.gazda = this;
              if(!beforeSaveScript) {
            	  bOK.view.onclick.Add( function(src, ea) {
            		  src.gazda.ok7Event();
            	  });
              } else {
            	  var beforeSaveconditionFunction = decode64(beforeSaveScript);
            	  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.ok7Event();");
            	  bOK.view.onclick.Add(beforeSaveFunction);
              }
            }
          }
          publ.Buttons15 = function(id, szulo, f, beforeSaveScript, afterSaveScript, newScript) {
        	  this.afterSaveScript64 = afterSaveScript;
        	  logger.debug("Tiltott gombok: " + f.tiltott);
        	  var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
        		  border : "0",
        		  width : "100%"
        	  });
        	  var IDAYXWJC = new JSCL.UI.Generic('tbody',
        			  IDAUXWJC.content, {});
        	  var IDAXXWJC = new JSCL.UI.Generic('tr',
        			  IDAYXWJC.content, {});
        	  if (f.tiltott.indexOf('CANCEL') < 0) {
        		  var IDA0XWJC = new JSCL.UI.Generic('td',
        				  IDAXXWJC.content, {
        			  align : "center"
        		  });
        		  var bCancel = new JSCL.UI.Button("wf.bCancel"
        				  + this.windowId, IDA0XWJC.content, {
        					  id : "wf.bCancel" + this.windowId,
        					  caption : f.btntext['CANCEL'] || "Vissza",
        					  style_width : "55px"
        				  }, '');
        		  bCancel.view.gazda = this;
        		  bCancel.view.onclick.Add( function(src, ea) {
        			  src.gazda.cancel7Event();
        		  });
        	  }
        	  if (f.tiltott.indexOf('NEW') < 0) {
        		  var IDA0XWJC = new JSCL.UI.Generic('td',
        				  IDAXXWJC.content, {
        			  align : "center"
        		  });
        		  bNew = new JSCL.UI.Button(
        				  "wf.bNew" + this.windowId,
        				  IDA0XWJC.content, {
        					  id : "wf.bNew" + this.windowId,
        					  caption : f.btntext['NEW'] || "Új",
        					  style_width : "55px"
        				  }, '');
        		  bNew.view.gazda = this;
        		  if(!newScript) {
        			  bNew.view.onclick.Add( function(src, ea) {
        				  src.gazda.new15Event();
        			  });
        		  } else {
        			  var conditionFunction = decode64(newScript);
        			  var newFunction = new Function("src", "ea", conditionFunction + ";src.gazda.new15Event();");
        			  bNew.view.onclick.Add(newFunction); 
        		  }
        	  }
        	  if (f.tiltott.indexOf('DEL') < 0) {
        		  var IDADWWJC = new JSCL.UI.Generic('td',
        				  IDAXXWJC.content, {
        			  align : "center"
        		  });
        		  bDel = new JSCL.UI.Button(
        				  "wf.bDel" + this.windowId,
        				  IDADWWJC.content, {
        					  id : "wf.bDel" + this.windowId,
        					  caption : f.btntext['DEL'] || "Törlés",
        					  style_width : "55px"
        				  }, '');
        		  bDel.view.gazda = this;
        		  bDel.view.onclick.Add( function(src, ea) {
        			  src.gazda.delete7Event();
        		  });
        	  }
        	  if (f.tiltott.indexOf('SAVE') < 0) {
        		  var IDADWWJC = new JSCL.UI.Generic('td',
        				  IDAXXWJC.content, {
        			  align : "center"
        		  });
        		  bSave = new JSCL.UI.Button("wf.bSave"
        				  + this.windowId, IDADWWJC.content, {
        					  id : "wf.bSave" + this.windowId,
        					  caption : f.btntext['SAVE'] || "Mentés",
        					  style_width : "55px"
        				  }, '');
        		  bSave.view.gazda = this;
        		  if(!beforeSaveScript) {
        			  bSave.view.onclick.Add( function(src, ea) {
        				  src.gazda.save15Event();
        			  });
        		  } else {
        			  var beforeSaveconditionFunction = decode64(beforeSaveScript);
        			  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.save15Event();");
        			  bSave.view.onclick.Add(beforeSaveFunction);
        		  }
        	  }
        	  if (f.tiltott.indexOf('OK') < 0) {
        		  var IDAXWWJC = new JSCL.UI.Generic('td',
        				  IDAXXWJC.content, {
        			  align : "center"
        		  });
        		  bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
        				  IDAXWWJC.content, {
        			  id : "wf.bOK" + this.windowId,
        			  caption : f.btntext['OK']
        			                      || "Mentés és vissza",
        			                      style_width : "55px"
        		  }, '');
        		  bOK.view.gazda = this;
        		  if(!beforeSaveScript) {
        			  bOK.view.onclick.Add( function(src, ea) {
        				  src.gazda.ok7Event();
        			  });
        		  } else {
        			  var beforeSaveconditionFunction = decode64(beforeSaveScript);
        			  var beforeSaveFunction = new Function("src", "ea", beforeSaveconditionFunction + ";src.gazda.ok15Event();");
        			  bOK.view.onclick.Add(beforeSaveFunction);
        		  }
        	  }
          }
          publ.okEvent = function() {
            if (this.saveEvent()) {
              WWWWWW.tartalom.closeLayer();
              this.sendRefresh();
            }
          }
          publ.ok7Event = function() {
            if (this.save7Event()) {
              if (this.sendVariable(this.paramField, this.dataId)) {
                WWWWWW.tartalom.closeLayer();
                this.selectorFunction(this.dsWF, this.windowId,
                    this.taskInstanceId, this.filterData,
                    this.provId, this.dataCtx, this);
                this.sendRefresh();
              }
            }
          }
          publ.saveEvent = function() {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "FormGenSaveXml");
            var err = new JSCL.Database.Errors(db);
            db.setParameter("windowId", this.windowId);
            db.setParameter("dataId", this.dataId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("provId", this.provId + "Task");
            db.setParameters(this.filterData);
            db.setFormParameters(document.getElementById(this.formName).jsObject, true);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                alert(err.getCode() + '-' + err.getMessage());
              }
              return (false);
            } else {
              if(this.afterSaveScript64 != null) {
            	  alert('Mentés utáni script indítása (szóljatok, ha már ez az ablak felesleges!)');
            	  eval(decode64(this.afterSaveScript64));
              }
              alert("Az adatok mentése sikeresen befejezõdött.");
              return (true);
            }
            this.sendRefresh();
          }
          publ.save15Event = function() {
        	  if(this.pendingNew) {
        		  var db = new JSCL.Database.Database();
        		  db.setData(db.SOURCETYPE.URL, "Command");
        		  db.setParameter("cmd", "FormGenSave15Xml");
        		  var err = new JSCL.Database.Errors(db);
        		  db.setParameter("windowId", this.windowId);
        		  db.setParameter("dataId", this.dataId);
        		  db.setParameter("taskInstanceId", this.taskInstanceId);
        		  db.setParameter("provId", this.provId + "Task");
        		  db.setParameters(this.filterData);
        		  db.setFormParameters(document.getElementById(this.formName).jsObject, true);
        		  db.retrieveData();
        		  if (err.isError()) {
        			  var errC = err.getCount();
        			  for ( var i = 1; i <= errC; i++) {
        				  err.setPosition(i);
        				  alert(err.getCode() + '-' + err.getMessage());
        			  }
        			  return (false);
        		  } else {
        			  if(this.afterSaveScript64 != null) {
        				  alert('Mentés utáni script indítása (szóljatok, ha már ez az ablak felesleges!)');
        				  eval(decode64(this.afterSaveScript64));
        			  }
        			  alert("Az adatok mentése sikeresen befejezõdött.");
        			  this.GridForm(this.wfColsArray, true);
        			  this.sendRefresh();
        			  this.pendingNew = false;
        			  return (true);
        		  }
        	  } else {
        		  
        		  this.save7Event();
        	  }
          }
          publ.save7Event = function() {
            if (this.dataId !== null) {
	          var id = this.dsWF.getField(this.dsWF
	              .getField("workflowKulcsmezo"));
	          var db = new JSCL.Database.Database();
	          db.setData(db.SOURCETYPE.URL, "Command");
	          db.setParameter("cmd", "FormGenSaveXml");
	          var err = new JSCL.Database.Errors(db);
	          db.setParameter("windowId", this.windowId);
	          db.setParameter("dataId", this.dataId);
	          db.setParameter("taskInstanceId", this.taskInstanceId);
	          db.setParameter("provId", this.provId + "Task");
	          db.setParameters(this.filterData);
	          db.setParameter(this.paramField, id);
	          db.setFormParameters(document
	              .getElementById(this.formName).jsObject, true);
	          db.retrieveData();
	          if (err.isError()) {
	            var errC = err.getCount();
	            for ( var i = 1; i <= errC; i++) {
	              err.setPosition(i);
	              alert(err.getCode() + '-' + err.getMessage());
	            }
	            return (false);
	          } else {
	        	if(this.afterSaveScript64 != null) {
	            	alert('Mentés utáni script indítása (szóljatok, ha már ez az ablak felesleges!)');
	            	eval(decode64(this.afterSaveScript64));
	            }
	            alert("Az adatok mentése sikeresen befejezõdött.");
	            this.GridForm(this.wfColsArray, true);
	            this.findIdInGrid(id);
	            this.sendRefresh();
	            return (true);
	          }
            } else {
              return (true);
            }
          }
          publ.cancelEvent = function() {
            WWWWWW.tartalom.closeLayer();
            this.sendRefresh();
          }
          publ.cancel7Event = function() {
            try {
              window.PageBus.unsubscribe("W" + this.windowId);
            } catch (err) {
              logger.debug(err.message);
            }
            WWWWWW.tartalom.closeLayer();
            this.sendRefresh();
          }
          publ.againEvent = function() {
            this.dbWF.setParameter("windowId", this.windowId);
            this.dbWF.setParameter("provId", this.provId + "Task");
            this.dbWF.setParameter("taskInstanceId",
                this.taskInstanceId);
            this.dbWF.setParameter("notSkip", "1");
            this.dbWF.setParameters(this.filterData);
            this.dbWF.retrieveData();
            if (this.errWF.isError()) {
              var errC = this.errWF.getCount();
              for ( var i = 1; i <= errC; i++) {
                this.errWF.setPosition(i);
                logger.debug(this.errWF.getCode() + '-'
                    + this.errWF.getMessage());
                alert(this.errWF.getCode() + '-'
                    + this.errWF.getMessage());
              }
            }
            this.dsWF.goToFirst();
            this.dsSearchWF.goToFirst();
          }

          publ.listButtons = function(id, szulo, f) {
            window.PageBus.subscribe("W" + this.windowId, this,
                this.onRefreshMessage, null);
            logger.debug("Tiltott gombok: " + f.tiltott);
            var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
              border : "0",
              width : "100%"
            });
            var IDAYXWJC = new JSCL.UI.Generic('tbody',
                IDAUXWJC.content, {});
            var IDAXXWJC = new JSCL.UI.Generic('tr',
                IDAYXWJC.content, {});
            if (f.tiltott.indexOf('CANCEL') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              var bCancel = new JSCL.UI.Button("wf.bCancel"
                  + this.windowId, IDA0XWJC.content, {
                id : "wf.bCancel" + this.windowId,
                caption : f.btntext['CANCEL'] || "Vissza",
                style_width : "55px"
              }, '');
              bCancel.view.gazda = this;
              bCancel.view.onclick.Add( function(src, ea) {
                src.gazda.gridCancelEvent();
              });
            }
            if (f.tiltott.indexOf('NEW') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bNew = new JSCL.UI.Button(
                  "wf.bNew" + this.windowId,
                  IDA0XWJC.content, {
                    id : "wf.bNew" + this.windowId,
                    caption : f.btntext['NEW'] || "Új",
                    style_width : "55px"
                  }, '');
              bNew.view.gazda = this;
              bNew.view.onclick.Add( function(src, ea) {
                src.gazda.newEvent();
              });
            }
            if (f.tiltott.indexOf('MODIFY') < 0) {
              var IDADXWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bMod = new JSCL.UI.Button(
                  "wf.bMod" + this.windowId,
                  IDADXWJC.content, {
                    id : "wf.bMod" + this.windowId,
                    caption : f.btntext['MODIFY']
                        || "Módosítás",
                    style_width : "85px"
                  }, '');
              bMod.view.gazda = this;
              bMod.view.onclick.Add( function(src, ea) {
                src.gazda.modifyEvent();
              });
            }
            if (f.tiltott.indexOf('DEL') < 0) {
              var IDADWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bDel = new JSCL.UI.Button(
                  "wf.bDel" + this.windowId,
                  IDADWWJC.content, {
                    id : "wf.bDel" + this.windowId,
                    caption : f.btntext['DEL'] || "Törlés",
                    style_width : "55px"
                  }, '');
              bDel.view.gazda = this;
              bDel.view.onclick.Add( function(src, ea) {
                src.gazda.deleteEvent();
              });
            }
            if (f.tiltott.indexOf('OK') < 0) {
              // var okCaption = (this.nextId == 'jbpm')
              var okCaption = (this.paramField != '') ? "Kiválasztás"
                  : "Mentés és vissza";
              var IDAXWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
                  IDAXWWJC.content, {
                    id : "wf.bOK" + this.windowId,
                    caption : f.btntext['OK'] || okCaption,
                    style_width : "105px"
                  }, '');
              bOK.view.gazda = this;
              // if (this.nextId == 'jbpm') {
              bOK.view.onclick.Add( function(src, ea) {
                src.gazda.gridKivalasztEvent();
              });
              // } else {
              // bOK.view.onclick.Add(function(src, ea) {
              // src.gazda.gridOkEvent();
              // });
              // }
            }
          }
          publ.gridCancelEvent = function() {
            try {
              window.PageBus.unsubscribe("W" + this.windowId);
            } catch (err) {
              logger.debug(err.message);
            }
            WWWWWW.tartalom.closeLayer();
            this.sendRefresh();
          }
          publ.gridOkEvent = function() {
            try {
              window.PageBus.unsubscribe("W" + this.windowId);
            } catch (err) {
              logger.debug(err.message);
            }
            WWWWWW.tartalom.closeLayer();
            this.sendRefresh();
          }
          publ.sendVariable = function(pFieldName, pFieldValue) {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "FormGenVariableXml");
            var err = new JSCL.Database.Errors(db);
            db.setParameter("windowId", this.windowId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("processInstanceId", this.processInstanceId);
            db.setParameter("paramField", pFieldName);
            db.setParameter("provId", this.provId + "Proc");
            this.filterData[pFieldName + "FigaroParameter"] = pFieldValue;
            db.setParameters(this.filterData);
            db.retrieveData();
            var retVal = err.isError();
            if (retVal) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                alert(err.getCode() + '-' + err.getMessage());
              }
            }
            return (!retVal);
          }
          publ.gridKivalasztEvent = function() {
            if (this.sendVariable(this.paramField, this.dataId)) {
              var res = this.selectorFunction(this.dsWF, this.windowId,
                  this.taskInstanceId, this.filterData,
                  this.provId, this.dataCtx, this);
              if(!isUndef(res)) {
            	  if(res == false) return;
              }
              WWWWWW.tartalom.closeLayer();
              this.sendRefresh();
            }
          }
          publ.ok30Event = function() {
            WWWWWW.tartalom.closeLayer();
            this.selectorFunction(this.dsWF, this.windowId,
                this.taskInstanceId, this.filterData,
                this.provId, this.dataCtx, this);
            this.sendRefresh();
          }
          publ.newEvent = function() {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "FormGenDataMgrXml");
            var ds = new JSCL.Database.Datasource("Workflow", db);
            ds.name = "Row";
            var err = new JSCL.Database.Errors(db);
            db.setParameter("action", "new");
            db.setParameter("windowId", this.windowId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("dataType", this.dataType);
            db.setParameter("paramField", this.paramField);
            db.setParameter("provId", this.provId + "Task");
            db.setParameters(this.filterData);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                if (err.getCode() == 'WF-003') {
                  alert(err.getMessage());
                } else {
                  alert(err.getCode() + '-'
                      + err.getMessage());
                }
              }
              return (false);
            } else {
              ds.goToFirst();
              this.filterData[this.paramField + "FigaroParameter"] = ds
                  .getField("DataId");
              if (this.sendVariable(this.paramField, ds
                  .getField("DataId"))) {
                var oForm = new WWWWWW.FormGen(this.nextId,
                    this.filterData, this.windowId,
                    this.taskInstanceId, this.provId);
              }
            }
          }
          publ.onlyInsertNewRecord = function() {
              var db = new JSCL.Database.Database();
              db.setData(db.SOURCETYPE.URL, "Command");
              db.setParameter("cmd", "FormGenDataMgrXml");
              var ds = new JSCL.Database.Datasource("Workflow", db);
              ds.name = "Row";
              var err = new JSCL.Database.Errors(db);
              db.setParameter("action", "new");
              db.setParameter("windowId", this.windowId);
              db.setParameter("taskInstanceId", this.taskInstanceId);
              db.setParameter("dataType", this.dataType);
              db.setParameter("paramField", this.paramField);
              db.setParameter("provId", this.provId + "Task");
              db.setParameters(this.filterData);
              db.retrieveData();
              if (err.isError()) {
                var errC = err.getCount();
                for ( var i = 1; i <= errC; i++) {
                  err.setPosition(i);
                  if (err.getCode() == 'WF-003') {
                    alert(err.getMessage());
                  } else {
                    alert(err.getCode() + '-'
                        + err.getMessage());
                  }
                }
                return (false);
              } else {
                ds.goToFirst();
                this.filterData[this.paramField + "FigaroParameter"] = ds
                    .getField("DataId");
                if (this.sendVariable(this.paramField, ds
                    .getField("DataId"))) {

                }
              }
            }
          publ.new15Event = function() {
        	/* karbantarto resz uritese */
        	var l = this.dsWF._listeners.length;
            for (var i = 0; i < l; i++) {
               var comp = this.dsWF._listeners[i];
               try {
            		   comp.setValue('');
               } catch (ex1) {
            	   
               }
               try {
            	   comp.view.value = '';
               } catch (ex1) {
            	   
               }
               
            }
            this.pendingNew = true;
          }
          publ.new7Event = function() {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "FormGenDataMgrXml");
            var ds = new JSCL.Database.Datasource("Workflow", db);
            ds.name = "Row";
            var err = new JSCL.Database.Errors(db);
            db.setParameter("action", "new");
            db.setParameter("windowId", this.windowId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("dataType", this.dataType);
            db.setParameter("paramField", this.paramField);
            db.setParameter("provId", this.provId + "Task");
            db.setParameters(this.filterData);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                if (err.getCode() == 'WF-003') {
                  alert(err.getMessage());
                } else {
                  alert(err.getCode() + '-'
                      + err.getMessage());
                }
              }
              return (false);
            } else {
              ds.goToFirst();
              var id = ds.getField("DataId");
              this.GridForm(this.wfColsArray, true);
              this.findIdInGrid(id);
              this.dataId = id;
            }
          }
          publ.modifyEvent = function() {
            if (this.dataId !== null) {
              this.filterData[this.paramField + "FigaroParameter"] = this.dataId;
              if (this.sendVariable(this.paramField, this.dataId)) {
                var oForm = new WWWWWW.FormGen(this.nextId,
                    this.filterData, this.windowId,
                    this.taskInstanceId, this.provId);
              }
            }
          }
          publ.nextEvent = function() {
        	  if(!this.nextId) {
        		  alert('Nincs nextId definiálva, valószínûleg hiba van a programban :-(');
        	  } else {
        		  if(this.nextId <= 0) {
        			  alert('Nem pozitív a nextId, valószínûleg hiba van a programban :-(');
        		  } else {
        			  var oForm = new WWWWWW.FormGen(
        					  nextId, this.filterData, this.windowId, this.taskInstanceId, 
        					  this.provId, {tipus:bUj, wfMezo:wfId, params:paramDefs},
        					  this.processInstanceId);
        		  }
        	  }
          }
          publ.prevEvent = function() {
        	  if(!this.prevId) {
        		  alert('Nincs prevId definiálva, valószínûleg hiba van a programban :-(');
        	  } else {
        		  if(this.prevId <= 0) {
        			  alert('Nem pozitív a prevId, valószínûleg hiba van a programban :-(');
        		  } else {
        			  var oForm = new WWWWWW.FormGen(
        					  prevId, this.filterData, this.windowId, this.taskInstanceId, 
        					  this.provId, {tipus:bUj, wfMezo:wfId, params:paramDefs},
        					  this.processInstanceId);
        		  }
        	  }
          }
          publ.deleteEvent = function() {
            if (this.dataId !== null) {
              if (confirm("Biztos törli az aktuális tételt?")) {
                var db = new JSCL.Database.Database();
                db.setData(db.SOURCETYPE.URL, "Command");
                db.setParameter("cmd", "FormGenDataMgrXml");
                var ds = new JSCL.Database.Datasource(
                    "Workflow", db);
                ds.name = "Row";
                var err = new JSCL.Database.Errors(db);
                db.setParameter("action", "delete");
                db.setParameter("windowId", this.windowId);
                db.setParameter("taskInstanceId",
                    this.taskInstanceId);
                db.setParameter("provId", this.provId + "Task");
                this.filterData[this.paramField
                    + "FigaroParameter"] = this.dataId;
                db.setParameters(this.filterData);
                db.setParameter("dataType", this.dataType);
                db.retrieveData();
                if (err.isError()) {
                  var errC = err.getCount();
                  for ( var i = 1; i <= errC; i++) {
                    err.setPosition(i);
                    alert(err.getCode() + '-'
                        + err.getMessage());
                  }
                  return (false);
                } else {
                  this.GridForm(this.wfColsArray, true);
                }
                this.dataId = null;
              }
            }
          }
          publ.delete7Event = function() {
            if (this.dataId !== null) {
              if (confirm("Biztos törli az aktuális tételt?")) {
                var db = new JSCL.Database.Database();
                db.setData(db.SOURCETYPE.URL, "Command");
                db.setParameter("cmd", "FormGenDataMgrXml");
                var ds = new JSCL.Database.Datasource(
                    "Workflow", db);
                ds.name = "Row";
                var err = new JSCL.Database.Errors(db);
                db.setParameter("action", "delete");
                db.setParameter("windowId", this.windowId);
                db.setParameter("taskInstanceId",
                    this.taskInstanceId);
                db.setParameter("provId", this.provId + "Task");
                this.filterData[this.paramField
                    + "FigaroParameter"] = this.dataId;
                db.setParameters(this.filterData);
                db.setParameter("dataType", this.dataType);
                db.retrieveData();
                if (err.isError()) {
                  var errC = err.getCount();
                  for ( var i = 1; i <= errC; i++) {
                    err.setPosition(i);
                    alert(err.getCode() + '-'
                        + err.getMessage());
                  }
                  return (false);
                } else {
                  this.GridForm(this.wfColsArray, true);
                }
                this.dataId = null;
                this.grid.selectRow(0);
              }
            }
          }
          publ.onRefreshMessage = function(subj, msg, data) {
            this.GridForm(this.wfColsArray, true);
          }
          publ.limitAlert = function() {
            this.dsRecLimitWF.goToFirst();
            if (this.dsRecLimitWF.getField("LIMIT") == "1") {
              alert("Lista-limit elérve!");
            }
          }
          publ.COLUMNS = {
            "Head" : 0,
            "Data" : 1,
            "Type" : 2
          };
          publ.letolt = function(targetElm, ds, wfColsArray) {
            try {
              var self = this;
              var most1 = new Date();
              self.grid = new JSCL.UI.Tablegrid("FormGenGrid");
              if (typeof targetElm == "undefined") {
                targetElm = "";
              }
              self.grid.id = "grid" + targetElm;
              self.grid.setData(ds);
              self.grid.height = getGridHeight(50)+"px";
              self.grid.columnsCount = wfColsArray.length;
              self.grid.columnsHead = function(i) {
                return wfColsArray[i][publ.COLUMNS.Head];
              };
              self.grid.columnsData = function(i) {
                return wfColsArray[i][publ.COLUMNS.Data];
              };
              self.grid.columnsType = function(i) {
                return wfColsArray[i][publ.COLUMNS.Type];
              };
              self.dataId = null;
              self.grid.gazda = self;
			  self.grid.formGenInstance = this;
			  self.grid.onRowClick = function(i, tbl) {
			    self.dataId = ds.getField(ds.getField("workflowKulcsmezo"));
			    if(self.gridClickHandlerFnc) {
			    	self.gridClickHandlerFnc(i, this.formGenInstance);
			    }
			  };
              self.grid.generate(targetElm);
              if(self.hasNavigator) {
            	  self.grid.navi = new JSCL.UI.DBNavigator("navigator" + self.windowId, targetElm, self.grid, null, this);
              }
              var most2 = new Date();
            } catch (E) {
              alert(E.message);
            }
          };
          publ.gridClickHandlerFnc = null;
          publ.setupGridClickHandler = function(src) {
        	  if(src) {
        		  this.gridClickHandlerFnc = new Function('i', 'formGenInstance', decode64(src));
        	  } else {
        		  this.gridClickHandlerFnc = null;
        	  }
          }
          publ.GridForm = function(wfColsArray, frissit) {
            this.wfColsArray = wfColsArray;
            try {
              this.dbWF.setParameter("windowId", this.windowId);
              this.dbWF.setParameter("provId", this.provId + "Task");
              this.dbWF.setParameter("taskInstanceId", this.taskInstanceId);
              this.dbWF.setParameter("notSkip", frissit ? "1" : "0");
              this.dbWF.setParameters(this.filterData);
              this.dbWF.retrieveData();
              if (this.errWF.isError()) {
                var errC = this.errWF.getCount();
                for ( var i = 1; i <= errC; i++) {
                  this.errWF.setPosition(i);
                  logger.debug(this.errWF.getCode() + '-'
                      + this.errWF.getMessage());
                  alert(this.errWF.getCode() + '-'
                      + this.errWF.getMessage());
                }
              }
              this.limitAlert();
              this.letolt(this.gridDivName, this.dsWF,
                  this.wfColsArray);
            } catch (ex) {
              if (Object.IsInstanceOf(ex,
                  JSCL.Events.RevokeException) === false) {
                throw ex;
              }
            }
          };
          publ.wfClientColsArray = [
              [ "Születési név", "Nev", "String" ],
              [ "Anyja neve", "AnyjaNeve", "String" ],
              [ "Születési hely", "SzulHely", "String" ],
              [ "Születési idõ", "SzulDat", "Date" ] ];
          publ.letolt5 = function(targetElm, ds) {
            try {
              var most1 = new Date();
              var grid = new JSCL.UI.Tablegrid("FormGenGrid");
              if (typeof targetElm == "undefined") {
                targetElm = "";
              }
              grid.id = "grid" + targetElm;
              grid.setData(ds);
              grid.height = getGridHeight(-110)+"px";
              grid.columnsCount = this.wfClientColsArray.length;
              var self = this;
              self.dataId = null;
              grid.columnsHead = function(i) {
                return self.wfClientColsArray[i][self.COLUMNS.Head];
              };
              grid.columnsData = function(i) {
                return self.wfClientColsArray[i][self.COLUMNS.Data];
              };
              grid.columnsType = function(i) {
                return self.wfClientColsArray[i][self.COLUMNS.Type];
              };
              grid.onRowClick = function(i) {
                self.dataId = self.dsClientWF
                    .getField("ClientId");
                self.dsWF.setFilter("[./wfDataId/text() = '"
                    + self.dsClientWF.getField("ClientId")
                    + "']");
                self.dsWF.goToFirst();
              };
              grid.generate(targetElm);
              var most2 = new Date();
              grid.selectRow(0, false);
              this.dsWF.setFilter("[./wfDataId/text() = '"
                  + this.dsClientWF.getField("ClientId")
                  + "']");
              this.dsWF.goToFirst();
              this.dataId = this.dsClientWF.getField("ClientId");
            } catch (E) {
              alert(E.message);
            }
          };
          publ.Selector5Form = function() {
            try {
              this.dbWF.setParameter("windowId", this.windowId);
              this.dbWF.setParameter("provId", this.provId + "Task");
              this.dbWF.setParameter("taskInstanceId",
                  this.taskInstanceId);
              this.dbWF.setParameter("notSkip", "1");
              this.dbWF.setParameters(this.filterData);
              this.dbWF.retrieveData();
              if (this.errWF.isError()) {
                var errC = this.errWF.getCount();
                for ( var i = 1; i <= errC; i++) {
                  this.errWF.setPosition(i);
                  logger.debug(this.errWF.getCode() + '-'
                      + this.errWF.getMessage());
                  alert(this.errWF.getCode() + '-'
                      + this.errWF.getMessage());
                }
              }
              this.limitAlert();
              this.letolt5(this.gridDivName, this.dsClientWF);
            } catch (ex) {
              if (Object.IsInstanceOf(ex,
                  JSCL.Events.RevokeException) === false) {
                throw ex;
              }
            }
          };
          publ.selector5Buttons = function(id, szulo, f, funkcio) {
            var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
              border : "0",
              width : "100%"
            });
            var IDAYXWJC = new JSCL.UI.Generic('tbody',
                IDAUXWJC.content, {});
            var IDAXXWJC = new JSCL.UI.Generic('tr',
                IDAYXWJC.content, {});
            if (f.tiltott.indexOf('CANCEL') < 0) {
              var IDA0XWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              var bCancel = new JSCL.UI.Button("wf.bCancel"
                  + this.windowId, IDA0XWJC.content, {
                id : "wf.bCancel" + this.windowId,
                caption : f.btntext['CANCEL'] || "Vissza",
                style_width : "55px"
              }, '');
              bCancel.view.gazda = this;
              bCancel.view.onclick.Add( function(src, ea) {
                src.gazda.cancelEvent();
              });
            }
            if (funkcio) {
              if (f.tiltott.indexOf('DEL') < 0) {
                var IDASWWJC = new JSCL.UI.Generic('td',
                    IDAXXWJC.content, {
                      align : "center"
                    });
                bDel = new JSCL.UI.Button("wf.bDel"
                    + this.windowId, IDASWWJC.content, {
                  id : "wf.bDel" + this.windowId,
                  caption : f.btntext['DEL'] || "Törlés",
                  style_width : "55px"
                }, '');
                bDel.view.gazda = this;
                bDel.view.onclick.Add( function(src, ea) {
                  src.gazda.selector5DeleteEvent();
                });
              }
              if (f.tiltott.indexOf('SAVE') < 0) {
                var IDADWWJC = new JSCL.UI.Generic('td',
                    IDAXXWJC.content, {
                      align : "center"
                    });
                bSave = new JSCL.UI.Button("wf.bSave"
                    + this.windowId, IDADWWJC.content, {
                  id : "wf.bSave" + this.windowId,
                  caption : f.btntext['SAVE'] || "Mentés",
                  style_width : "55px"
                }, '');
                bSave.view.gazda = this;
                bSave.view.onclick.Add( function(src, ea) {
                  src.gazda.selector5SaveEvent(true);
                });
              }
            }
            if (f.tiltott.indexOf('OK') < 0) {
              var IDAXWWJC = new JSCL.UI.Generic('td',
                  IDAXXWJC.content, {
                    align : "center"
                  });
              bOK = new JSCL.UI.Button("wf.bOK" + this.windowId,
                  IDAXWWJC.content, {
                    id : "wf.bOK" + this.windowId,
                    caption : f.btntext['OK']
                        || "Mentés és vissza",
                    style_width : "105px"
                  }, '');
              bOK.view.gazda = this;
              bOK.view.onclick.Add( function(src, ea) {
                src.gazda.selector5OkEvent();
              });
            }
          }
          publ.selector5OkEvent = function() {
            WWWWWW.tartalom.closeLayer();
            this.sendRefresh();
          }
          publ.selector5SaveEvent = function(uzenet) {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "FormGenSaveXml");
            var err = new JSCL.Database.Errors(db);
            db.setParameter("windowId", this.windowId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("provId", this.provId + "Task");
            this.filterData[this.paramField + "FigaroParameter"] = this.dataId;
            db.setParameters(this.filterData);
            db.setParameter("ujAdatRekord", "I");
            db.setFormParameters(document
                .getElementById(this.formName).jsObject, true);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                alert(err.getCode() + '-' + err.getMessage());
              }
              return (false);
            } else {
              this.Selector5Form();
              if (uzenet) {
                alert("Az adatok mentése sikeresen befejezõdött.");
              }
              return (true);
            }
          }
          publ.selector5DeleteEvent = function() {
            if (this.dataId !== null) {
              if (confirm("Biztos törli az aktuális tételt?")) {
                var db = new JSCL.Database.Database();
                db.setData(db.SOURCETYPE.URL, "Command");
                db.setParameter("cmd", "FormGenDataMgrXml");
                var ds = new JSCL.Database.Datasource(
                    "Workflow", db);
                ds.name = "Row";
                var err = new JSCL.Database.Errors(db);
                db.setParameter("action", "delete");
                db.setParameter("windowId", this.windowId);
                db.setParameter("taskInstanceId",
                    this.taskInstanceId);
                db.setParameter("provId", this.provId + "Task");
                this.filterData[this.paramField
                    + "FigaroParameter"] = this.dataId;
                db.setParameters(this.filterData);
                db.setParameter("dataType", this.dataType);
                db.retrieveData();
                if (err.isError()) {
                  var errC = err.getCount();
                  for ( var i = 1; i <= errC; i++) {
                    err.setPosition(i);
                    alert(err.getCode() + '-'
                        + err.getMessage());
                  }
                  return (false);
                } else {
                  this.Selector5Form();
                }
                this.dataId = null;
              }
            }
          }
          publ.sendRefresh = function() {
            if (this.callerWindowId != 0) {
              window.PageBus.publish("W" + this.callerWindowId,
                  {}, this.windowId);
            }
          }

          publ.searchButton = function(id, szulo, f) {
            var IDAUXWJC = new JSCL.UI.Generic('table', szulo, {
              border : "0",
              width : "100%"
            });
            var IDAYXWJC = new JSCL.UI.Generic('tbody',
                IDAUXWJC.content, {});
            var IDAXXWJC = new JSCL.UI.Generic('tr',
                IDAYXWJC.content, {});

            var IDASWWJC = new JSCL.UI.Generic('td',
                IDAXXWJC.content, {
                  align : "left"
                });
            bSearch = new JSCL.UI.Button("wf.bSearch"
                + this.windowId, IDASWWJC.content, {
              id : "wf.bSearch" + this.windowId,
              caption : "Keresés",
              style_width : "65px"
            }, '');
            bSearch.view.gazda = this;
            bSearch.view.onclick.Add( function(src, ea) {
              src.gazda.SearchEvent();
            });
          }

          publ.SearchEvent = function() {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", "WorkflowSearchSaveParamsXml");
            var err = new JSCL.Database.Errors(db);
            db.setParameter("windowId", this.windowId);
            db.setParameter("provId", this.provId + "Task");
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("processInstanceId", this.processInstanceId);
            db.setParameters(this.filterData);
            this.filterData[this.paramField + "FigaroParameter"] = this.dataId;
            /* az utolso parameter miatt a kotelezo mezoket nem veszi figyelembe a keresesnel */
            db.setFormParameters(document
                .getElementById(this.formName).jsObject, true, true);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                alert(err.getCode() + '-' + err.getMessage());
              }
              return (false);
            } else {
              this.GridForm(this.wfColsArray, true);
            }
          }
          publ.openFormGen = function(defVal, dataFields, dataCtx) {
              // alert("Hello:"+defVal+'this.taskInstanceId:'+this.taskInstanceId);
          	var cloneFilterData = [];
          	for(var x in this.filterData) {
          		cloneFilterData[x] = this.filterData[x];
          	}
              var l = dataFields.length;
              if (l > 0) {
                for ( var i = 0; i < l; i++) {
                  var mezo = dataFields[i];
                  if (mezo.indexOf('fld:') == 0) {
                    mezo = mezo.substr(4, mezo.length-4);
                    var fld = document.getElementById("wf"+mezo);
                    if (fld == null) {
                  	fld = document.getElementById("wf"+mezo+this.windowId);
                    }
                    if (fld != null) {
                  	  cloneFilterData["wf" + mezo + "FigaroParameter"] = fld.jsObject.getValue();
                      logger.debug(mezo+"="+fld.jsObject.getValue());
                    }
                  } else {
                  	cloneFilterData["wf" + mezo + "FigaroParameter"] = this.dsWF
                        .getField(mezo);
                      logger.debug(mezo+"#"+this.dsWF.getField(mezo));
                  }
                }
              }
              var oForm = new WWWWWW.FormGen(defVal, cloneFilterData,
                  this.windowId, this.taskInstanceId, this.provId, dataCtx, this.processInstanceId);
          }
          publ.openFormGenHandler = function(src, ea) {
            var dataF = ea.params.paramF.dataF||[];
            var dataCtx = ea.params.paramF.dataCtx||{};
            src.gazda.openFormGen(ea.params.winId,
                dataF, dataCtx);
          }
          publ.executeCommandHandler = function(src, ea) {
            src.gazda.executeCommand(ea.params.command,
                ea.params.parameter);
          }
          publ.executeScriptHandler = function(src, ea) {
            logger.debug(decode64(ea.params.script));
            eval(decode64(ea.params.script));
          }
          publ.executeCommand = function(command, paramStr) {
            var db = new JSCL.Database.Database();
            db.setData(db.SOURCETYPE.URL, "Command");
            db.setParameter("cmd", command);
            var err = new JSCL.Database.Errors(db);
            db.setParameter("windowId", this.windowId);
            db.setParameter("taskInstanceId", this.taskInstanceId);
            db.setParameter("provId", this.provId + "Task");
            db.setParameter("parameter", paramStr);
            db.setParameters(this.filterData);
            db.retrieveData();
            if (err.isError()) {
              var errC = err.getCount();
              for ( var i = 1; i <= errC; i++) {
                err.setPosition(i);
                alert(err.getCode() + '-' + err.getMessage());
              }
            }
          }
          publ.feladatKezeles = function(ugyletAblakId, ugyletAblakLbl, ugyletAblakWfId, ugyletAblakParamDefs) {
            var bUj = this.dataCtx['tipus'];
            var wfId = this.dataCtx['wfMezo'];
            var paramDefs = this.dataCtx['params'];
            var azon;
            if (wfId.match("^fld") == "fld") {
              var varName = wfId.substr(4);
              azon = document.getElementById(this.formName).jsObject.getFieldValue(varName);
            } else {
              if (wfId.match("^const") == "const") {
                var varName = wfId.substr(6);
                azon = varName;
              } else {
                if (wfId.match("^ds") == "ds") {
                  var varName = wfId.substr(3);
                  azon = this.dsWF.getField(varName);
                }
              }
            }
            var variableDefs = {};
            for (var a in paramDefs) {
              var ertek = "";
              var kulcs = "";
              if (a.match("^fld") == "fld") {
                var varName = a.substr(4);
                ertek = document.getElementById(this.formName).jsObject.getFieldValue(varName);
                kulcs = paramDefs[a];
              } else {
                if (a.match("^const") == "const") {
                  var varName = a.substr(6);
                  ertek = varName;
                  kulcs = paramDefs[a];
                } else {
                  if (a.match("^ds") == "ds") {
                    var varName = a.substr(3);
                    ertek = this.dsWF.getField(varName);
                    kulcs = paramDefs[a];
                  } else {
                    if (a.match("^session") == "session") {
                      var varName = "session_"+a.substr(8);
                      ertek = paramDefs[a];
                      kulcs = varName;
                    }
                  }
                }
              }
              variableDefs[kulcs] = ertek;
            }
            if (bUj) {
              WWWWWW.feladat.feladatInditas(azon, variableDefs, ugyletAblakId, ugyletAblakLbl, ugyletAblakWfId, ugyletAblakParamDefs);
            } else {
              WWWWWW.feladat.feladatFolytatas(azon, variableDefs, ugyletAblakId, ugyletAblakLbl, ugyletAblakWfId, ugyletAblakParamDefs);
            }
          }
          publ.findIdInGrid = function(id) {
            var rc = this.grid.getRowCount();
            var found = false;
            var kulcsmezo = 'x';
            if(this.dsWF.currentRow == null && rc > 0) {
            	try {
            		this.dsWF.setPosition(1);
            		kulcsmezo = this.dsWF.getField("workflowKulcsmezo");
            	} catch (ex) {
            		alert("Hiba a kulcsmezo meghatarozasakor: " + ex);
            		this.grid.selectRow(0);
            		return;
            	}
            	this.dsWF.setPosition(1);
            } else {
            	kulcsmezo = this.dsWF.getField("workflowKulcsmezo");
            }
            if(kulcsmezo != '') {
            	for ( var i = 0; i < rc; i++) {
            		var _url = '/' + this.dsWF.table + '/Row['+ (i + 1)+ ']/' + kulcsmezo;
            		var idNode = this.dsWF.xml.selectSingleNode(_url);
            		if(idNode) {
            			var actId = this.scrapTextNodes(idNode);
            			if (id == actId) {
            				this.grid.selectRow(i);
            				found = true;
            				break;
            			}
            		}
            	}    	
            }
            if (found == false) {
              this.grid.selectRow(0);
            }
          }
          publ.scrapTextNodes = function(oElem) {
        	  var s = "";
              for(var i=0;i<oElem.childNodes.length;i++) {
                var oNode = oElem.childNodes[i];
                if (oNode.nodeType == 3) {
                  s += oNode.nodeValue;
                } else if(oNode.nodeType == 1) {
                  s += "\n" + scrapTextNodes(oNode);
                }
              }
              return s;
          }
          publ.selectorFunction = function(ds, windowId,
              taskInstanceId, filterData, provId, dataCtx, formGenInstance) {
            var result = true;
            if (this.selectorScriptStr != null) {
              eval(decode64(this.selectorScriptStr));
            }
            return result;
          }
        });

WWWWWW.FormGen.getInstance = function(winId, tomb, callerWindowId,
    taskInstanceId, provId, dataCtx) {
  var ujTomb = [];
  for ( var n in tomb) {
    ujTomb["wf" + n + "FigaroParameter"] = tomb[n];
  }
  return (new WWWWWW.FormGen(winId, ujTomb, callerWindowId, taskInstanceId,
      provId, dataCtx));
};

WWWWWW.FormGen.getVariables = function(taskInstanceId, provId) {
  var db = new JSCL.Database.Database();
  db.setData(db.SOURCETYPE.URL, "Command");
  db.setParameter("cmd", "FormGenGetVariablesXml");
  var ds = new JSCL.Database.Datasource("Variables", db);
  ds.name = "Row";
  var err = new JSCL.Database.Errors(db);
  db.setParameter("taskInstanceId", taskInstanceId);
  db.setParameter("provId", provId);
  db.retrieveData();
  if (err.isError()) {
    throw new JSCL.Lang.Exception(err);
  }
  ds.goToFirst();
  return (ds);
};

WWWWWW.FormGen.getVariablesByPID = function(pid, provId) {
  var db = new JSCL.Database.Database();
  db.setData(db.SOURCETYPE.URL, "Command");
  db.setParameter("cmd", "FormGenGetVariablesXml");
  var ds = new JSCL.Database.Datasource("Variables", db);
  ds.name = "Row";
  var err = new JSCL.Database.Errors(db);
  db.setParameter("processInstanceId", pid);
  db.setParameter("provId", provId);
  db.retrieveData();
  if (err.isError()) {
    throw new JSCL.Lang.Exception(err);
  }
  ds.goToFirst();
  return (ds);
};

WWWWWW.FormGen.refreshFields = function(ds, fieldMap, targetWindowId) {
    for ( var n in fieldMap) {
      var elem = document.getElementById("wf"+n);
      if (elem == null) {
    	elem = document.getElementById("wf"+n+targetWindowId);
      }
      elem.jsObject.setValue(ds.getField(fieldMap[n]));
    }
};

WWWWWW.FormGen.PopUpButtons =
  JSCL.Lang.Class("WWWWWW.FormGen.PopUpButtons",
                  function(publ) {
                    publ.init = function(id, szulo, f, callBackFunc) {
                      var IDARUXWJC = new JSCL.UI.Generic('table', szulo, {border:"0",width:"100%"});
                      var IDARYXWJC = new JSCL.UI.Generic('tbody', IDARUXWJC.content, {});
                      var IDARXXWJC = new JSCL.UI.Generic('tr', IDARYXWJC.content, {});
                      var IDARDXWJC = new JSCL.UI.Generic('td', IDARXXWJC.content, {align:"center"});
                      this.bCancel = new JSCL.UI.Button("wf.bCancel", IDARDXWJC.content, {id:"wf.bCancel",caption:"Mégsem",style_width:"55px"}, '');
                      this.bCancel.view.gazda = this;
                      this.bCancel.view.onclick.Add(function(src, ea) {
                        callBackFunc();
                      });
                    }
                    publ.bCancel;
                  }
                 )
  ;
;
WWWWWW.SearchOrCancelButtons =
  JSCL.Lang.Class("WWWWWW.SearchOrCancelButtons",
                  function(publ) {
                    publ.init = function(id, szulo, f, callBackSearch, callBackCancelFunc) {
                      var IDARUXWJC = new JSCL.UI.Generic('table', szulo, {border:"0",width:"100%"});
                      var IDARYXWJC = new JSCL.UI.Generic('tbody', IDARUXWJC.content, {});
                      var IDARXXWJC = new JSCL.UI.Generic('tr', IDARYXWJC.content, {});
                      var IDARDXWJC = new JSCL.UI.Generic('td', IDARXXWJC.content, {align:"center"});
                      this.bSearch = new JSCL.UI.Button("wf.bSearch", IDARDXWJC.content, {id:"wf.bSearch",caption:"Keresés",style_width:"55px"}, '');
                      this.bSearch.view.gazda = this;
                      this.bSearch.view.onclick.Add(function(src, ea) {
                        callBackSearch();
                      });

                      this.bCancel = new JSCL.UI.Button("wf.bCancel", IDARDXWJC.content, {id:"wf.bCancel",caption:"Mégsem",style_width:"55px"}, '');
                      this.bCancel.view.gazda = this;
                      this.bCancel.view.onclick.Add(function(src, ea) {
                        callBackCancelFunc();
                      });
                    }
                    publ.bSearch;
                    publ.bCancel;
                  }
                 )
  ;
;
JSCL.namespace("WWWWWW");

WWWWWW.FeladatKezelo = JSCL.Lang.Class("WWWWWW.FeladatKezelo",
    JSCL.Application.Base, function(publ, supr) {
      publ.init = function(id) {
        supr(this).init(id);
        this.processId = null;
        this.feladatId = null;
        this.taskInstanceId = null;
      }
      publ.feladatId;
      publ.feladatName;
      publ.taskInstanceId;
      publ.variableDefs;
      publ.COLUMNS = {
        "Head" : 0,
        "Data" : 1,
        "Type" : 2
      };
      // publ.colsArray = null;
    publ.updateField = function(fld, value) {
      var elem = document.getElementById(fld);
      elem.value = value;
    }
    publ.main = function(bUj, filter) {
      try {
        var feladatDiv = WWWWWW.tartalom.openLayer();
        var oEngine = new JSCL.Engine.Generator();
        oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
        oEngine.setParameter("cmd", "GeneralRF");
        if (bUj) {
          oEngine.setParameter("action", "FeladatKezeloUjRF");
        } else {
          oEngine.setParameter("action", "FeladatKezeloFolytatasRF");
        }
        oEngine.generate(feladatDiv.id);
        var dbFK = new JSCL.Database.Database();
        dbFK.setData(dbFK.SOURCETYPE.URL, "Command");
        dbFK.setParameter("cmd", "FeladatKezeloXml");
        if (bUj) {
          dbFK.setParameter("bUj", "I");
          if (isUndef(filter)) {
            filter = "V";
          }
          dbFK.setParameter("filter", filter);
        } else {
          dbFK.setParameter("bUj", "N");
        }
        var errFK = new JSCL.Database.Errors(dbFK);
        dsFK = new JSCL.Database.Datasource("FeladatKezelo", dbFK);
        dsFK.name = "Row";
        dbFK.retrieveData();
        if (errFK.isError()) {
          var errC = errFK.getCount();
          for ( var i = 1; i <= errC; i++) {
            errFK.setPosition(i);
            logger.debug(errFK.getCode() + '-' + errFK.getMessage());
            alert(errFK.getCode() + '-' + errFK.getMessage());
          }
        } else {
          if (dsFK.getCount() == 1) {
            dsFK.goToFirst();
            WWWWWW.feladat.feladatId = dsFK.getField('Id');
            WWWWWW.feladat.processId = dsFK.getField('Id');
            WWWWWW.feladat.feladatName = dsFK.getField('Nev');
            WWWWWW.feladat.kivalasztas(true);
          } else {
            var szulo = document.getElementById("FeladatKezeloDiv");
            this.letolt(szulo, dsFK);
          }
        }
      } catch (ex) {
      }
    }
    publ.letolt = function(targetElm, ds) {
      // this.colsArray = colsArray;
      var oszlopok = [ [ "Leírás", "Nev", "String" ] ]
      var most1 = new Date();
      var grid = new JSCL.UI.Tablegrid("FeladatKezeloGrid");
      if (typeof targetElm == "undefined") {
        targetElm = "";
      }
      grid.id = "grid" + targetElm;
      grid.setData(ds);
      grid.height = getGridHeight(50)+"px";
      grid.columnsCount = oszlopok.length;
      grid.columnsHead = function(i) {
        return oszlopok[i][publ.COLUMNS.Head];
      }
      grid.columnsData = function(i) {
        return oszlopok[i][publ.COLUMNS.Data];
      }
      grid.columnsType = function(i) {
        return oszlopok[i][publ.COLUMNS.Type];
      }
      grid.onRowClick = function(i) {
        WWWWWW.feladat.feladatId = ds.getField('Id');
        WWWWWW.feladat.processId = ds.getField('Id');
        WWWWWW.feladat.feladatName = ds.getField('Nev');
      }
      grid.generate(targetElm);
      var most2 = new Date();
      // logger.debug(((most2-most1)/1000));
    }
    publ.tevekenysegekDL = function(ugyletAblakId, ugyletAblakLbl, ugyletAblakWfId, ugyletAblakParamDefs) {
      WWWWWW.menu.ClearMenuFrame();
      var oEngine = new JSCL.Engine.Generator();
      oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
      oEngine.setParameter("cmd", "TevekenysegekRF");
      oEngine.setParameter("Id", this.feladatId);
      if(ugyletAblakId) {
    	  oEngine.setParameter("ugyletAblakId", ugyletAblakId);
      }
      if(ugyletAblakLbl) {
    	  oEngine.setParameter("ugyletAblakLbl", ugyletAblakLbl);
      }
      if(ugyletAblakWfId) {
    	  oEngine.setParameter("ugyletAblakWfId", ugyletAblakWfId);
      }
      if(ugyletAblakParamDefs) {
    	  oEngine.setParameter("ugyletAblakParamDefs", JSON.stringify(ugyletAblakParamDefs).replace(/"/g,"'"));
      }
      oEngine.setParameter("Id", this.feladatId);
      oEngine.generate("MenuFrame");
      WWWWWW.menu.setMenuDisplay(true);
      WWWWWW.info.InfoDL(0, 0, null, this.feladatId);
    }

    publ.tovabbleptetes = function(transitionName, megerosites) {
      var tovabb = true;
      if (isUndef(megerosites)) {
        megerosites = '';
      }
      if (megerosites.length > 0) {
        tovabb = window.confirm(megerosites);
      }
      if (tovabb) {
        var dbFI = new JSCL.Database.Database();
        dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
        dbFI.setParameter("cmd", "Tovabbleptetes");
        dbFI.setParameter("Id", this.feladatId);
        dbFI.setParameter("Name", transitionName);
        var errFI = new JSCL.Database.Errors(dbFI);
        dbFI.retrieveData();
        if (errFI.isError()) {
          var errC = errFI.getCount();
          for ( var i = 1; i <= errC; i++) {
            errFI.setPosition(i);
            alert(errFI.getCode() + '-' + errFI.getMessage());
          }
        } else {
          this.tevekenysegekDL();
          WWWWWW.tartalom.closeAllLayer();
        }
      }
    }

    publ.kivalasztas = function(bUj) {
      if (this.processId != null) {
        WWWWWW.tartalom.closeLayer();
        if (bUj) {
          var dbFI = new JSCL.Database.Database();
          dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
          dbFI.setParameter("cmd", "FeladatInditas");
          dbFI.setParameter("Name", this.processId);
          var dsFI = new JSCL.Database.Datasource("FeladatInditas", dbFI);
          dsFI.name = "Row";
          var errFI = new JSCL.Database.Errors(dbFI);
          dbFI.retrieveData();
          if (errFI.isError()) {
            var errC = errFI.getCount();
            for ( var i = 1; i <= errC; i++) {
              errFI.setPosition(i);
              alert(errFI.getCode() + '-' + errFI.getMessage());
            }
          } else {
            dsFI.goToFirst();
            this.processId = null;
            this.feladatId = dsFI.getField("Id");
            this.feladatName = dsFI.getField("Nev");
            this.tevekenysegekDL();
          }
        } else {
          this.tevekenysegekDL();
        }
      } else {
        alert("Elõször választani kell a feladat listából.");
      }
    }

    publ.tevekenysegInditas = function() {
      var dbFI = new JSCL.Database.Database();
      dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
      dbFI.setParameter("cmd", "TevekenysegInditas");
      dbFI.setParameter("Id", this.feladatId);
      var dsFI = new JSCL.Database.Datasource("TevekenysegInditas", dbFI);
      dsFI.name = "Row";
      var errFI = new JSCL.Database.Errors(dbFI);
      dbFI.retrieveData();
      if (errFI.isError()) {
        var errC = errFI.getCount();
        for ( var i = 1; i <= errC; i++) {
          errFI.setPosition(i);
          alert(errFI.getCode() + '-' + errFI.getMessage());
        }
      } else {
        dsFI.goToFirst();
        var taskInstanceId = dsFI.getField("Id");
        var taskInstanceName = dsFI.getField("Nev");
        this.taskInstanceId = taskInstanceId;
        this.feladatVariables();
        if (taskInstanceName == "") {
          this.tevekenysegekDL();
        } else {
          WWWWWW.tartalom.closeToLayer(0); // Laca
          // if (this.taskInstanceId != null) {
          // this.tevekenysegCancel();
          // }
          var tomb = [];
          var oForm = new WWWWWW.FormGen(taskInstanceName, tomb, 0,
              taskInstanceId);
        }
      }
    }

    publ.tevekenysegFolytatas = function(taskInstanceId, winId) {
      /* a winId: nem az, amit a taskInstanceId kozv. meghatároz, hanem aliasolt! */
      var dbFI = new JSCL.Database.Database();
      dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
      dbFI.setParameter("cmd", "TevekenysegFolytatas");
      dbFI.setParameter("Id", this.feladatId);
      dbFI.setParameter("winId", winId);
      dbFI.setParameter("taskInstanceId", taskInstanceId);
      var dsFI = new JSCL.Database.Datasource("TevekenysegFolytatas", dbFI);
      dsFI.name = "Row";
      var errFI = new JSCL.Database.Errors(dbFI);
      dbFI.retrieveData();
      if (errFI.isError()) {
        var errC = errFI.getCount();
        for ( var i = 1; i <= errC; i++) {
          errFI.setPosition(i);
          alert(errFI.getCode() + '-' + errFI.getMessage());
        }
      } else {
        dsFI.goToFirst();
        var taskInstanceId = dsFI.getField("Id");
        var taskInstanceName = dsFI.getField("Nev");
        this.taskInstanceId = taskInstanceId;
        this.feladatVariables();
        if (taskInstanceName == "") {
          this.tevekenysegekDL();
        } else {
          WWWWWW.tartalom.closeToLayer(0);
          // if (this.taskInstanceId != null) {
          // this.tevekenysegCancel();
          // }
          if (this.taskInstanceId != null) {
            this.tevekenysegCancel();
          }
          this.taskInstanceId = taskInstanceId;
          var tomb = [];
          var oForm = new WWWWWW.FormGen(taskInstanceName, tomb, 0, taskInstanceId);
        }
      }
    }

    publ.tevekenysegCancel = function() {
      var dbFI = new JSCL.Database.Database();
      dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
      dbFI.setParameter("cmd", "TevekenysegCancelXml");
      dbFI.setParameter("Id", this.feladatId);
      dbFI.setParameter("taskInstanceId", this.taskInstanceId);
      var errFI = new JSCL.Database.Errors(dbFI);
      dbFI.retrieveData();
      if (errFI.isError()) {
        var errC = errFI.getCount();
        for ( var i = 1; i <= errC; i++) {
          errFI.setPosition(i);
          alert(errFI.getCode() + '-' + errFI.getMessage());
        }
        return (false);
      }
      return (true);
    }
    publ.feladatVariables = function() {
      var dbFV = new JSCL.Database.Database();
      dbFV.setData(dbFV.SOURCETYPE.URL, "Command");
      dbFV.setParameter("cmd", "FormGenVariablesXml");
      var paramFields = "";
      for (var a in this.variableDefs) {
        dbFV.setParameter(a, this.variableDefs[a]);
        if (paramFields.length == 0) {
          paramFields = a;
        } else {
          paramFields = paramFields+":"+a;
        }
      }
      dbFV.setParameter("paramFields", paramFields);
      dbFV.setParameter("taskInstanceId", this.taskInstanceId);
      dbFV.setParameter("provId", "JBPMProc");
      var errFV = new JSCL.Database.Errors(dbFV);
      dbFV.retrieveData();
      if (errFV.isError()) {
        var errC = errFV.getCount();
        for ( var i = 1; i <= errC; i++) {
          errFV.setPosition(i);
          alert(errFV.getCode() + '-' + errFV.getMessage());
        }
      }
    }
    publ.feladatInditas = function(wfId, variableDefs) {
      this.variableDefs = variableDefs;
      var dbFI = new JSCL.Database.Database();
      dbFI.setData(dbFI.SOURCETYPE.URL, "Command");
      dbFI.setParameter("cmd", "FeladatInditas");
      dbFI.setParameter("Name", wfId);
      var paramFields = "";
      for (var a in this.variableDefs) {
        dbFI.setParameter(a, this.variableDefs[a]);
        if (paramFields.length == 0) {
          paramFields = a;
        } else {
          paramFields = paramFields+":"+a;
        }
      }
      dbFI.setParameter("paramFields", paramFields);
      var dsFI = new JSCL.Database.Datasource("FeladatInditas", dbFI);
      dsFI.name = "Row";
      var errFI = new JSCL.Database.Errors(dbFI);
      dbFI.retrieveData();
      if (errFI.isError()) {
        var errC = errFI.getCount();
        for ( var i = 1; i <= errC; i++) {
          errFI.setPosition(i);
          alert(errFI.getCode() + '-' + errFI.getMessage());
        }
      } else {
        dsFI.goToFirst();
        this.processId = null;
        this.feladatId = dsFI.getField("Id");
        this.feladatName = dsFI.getField("Nev");
        this.tevekenysegekDL();
      }
    }
    publ.feladatFolytatas = function(wfId, variableDefs, ugyletAblakId, ugyletAblakLbl, ugyletAblakWfId, ugyletAblakParamDefs) {
      this.feladatId = wfId;
      this.variableDefs = variableDefs;
      var dbLock = new JSCL.Database.Database();
      dbLock.setData(dbLock.SOURCETYPE.URL, "Command");
      dbLock.setParameter("cmd", "FeladatLock");
      dbLock.setParameter("Id", wfId);
      var errLock = new JSCL.Database.Errors(dbLock);
      dbLock.retrieveData();
      if (errLock.isError()) {
        var errC = errLock.getCount();
        for (var i = 1; i <= errC; i++) {
          errLock.setPosition(i);
          logger.debug(errLock.getCode()+'-'+errLock.getMessage());
          alert(errLock.getCode()+'-'+errLock.getMessage());
        }
      } else {
        this.tevekenysegekDL(ugyletAblakId, ugyletAblakLbl,ugyletAblakWfId,ugyletAblakParamDefs);
      }
    }
    publ.feladatUnlock = function() {
      var dbLock = new JSCL.Database.Database();
      dbLock.setData(dbLock.SOURCETYPE.URL, "Command");
      dbLock.setParameter("cmd", "FeladatUnlock");
      dbLock.setParameter("Id", WWWWWW.feladat.feladatId);
      var errLock = new JSCL.Database.Errors(dbLock);
      dbLock.retrieveData();
      if (errLock.isError()) {
        var errC = errLock.getCount();
        for ( var i = 1; i <= errC; i++) {
          errLock.setPosition(i);
          logger.debug(errLock.getCode() + '-' + errLock.getMessage());
          alert(errLock.getCode() + '-' + errLock.getMessage());
        }
      }
    }
    publ.feladatLock = function() {
        var dbLock = new JSCL.Database.Database();
        dbLock.setData(dbLock.SOURCETYPE.URL, "Command");
        dbLock.setParameter("cmd", "FeladatLock");
        dbLock.setParameter("Id", WWWWWW.feladat.feladatId);
        var errLock = new JSCL.Database.Errors(dbLock);
        dbLock.retrieveData();
        if (errLock.isError()) {
          var errC = errLock.getCount();
          for ( var i = 1; i <= errC; i++) {
            errLock.setPosition(i);
            logger.debug(errLock.getCode() + '-' + errLock.getMessage());
            alert(errLock.getCode() + '-' + errLock.getMessage());
          }
        }
      }
    publ.feladatFomenu = function() {
      // WWWWWW.menu.ClearMenuFrame();
      // WWWWWW.bulletin.BulletinDL();
      // WWWWWW.info.InfoDL();
      WWWWWW.feladat.feladatUnlock();
      WWWWWW.exit();
      Ring.main(false);
      // WWWWWW.menu.FoMenuDL();
    }
    publ.ugyletablak = function(winId, wfId, paramDefs) {
    	try {
    		/*WWWWWW.menu.MenuDL(true, Ring.ejrSystem.toUpperCase(), Ring.ejrApplication);
    		WWWWWW.info.InfoDL(0, -1, null);*/
    		WWWWWW.feladat.feladatUnlock();
    	    WWWWWW.exit();
    		//Ring.main4(false, winId, wfId, paramDefs,  [], 0, "MenuParams", 0);
    	    WWWWWW.tartalom.closeLayer();
    	} catch (ex) {
    		alert('Hiba az ugyletablak visszanyitásánál: ' + ex);
    	}
    }
  });;

JSCL.namespace("WWWWWW");

WWWWWW.FeladatFolytatas = JSCL.Lang.Class("WWWWWW.FeladatFolytatas",
    JSCL.Application.Base, function(publ, supr) {
      publ.init = function(id) {
        supr(this).init(id);
      }
      publ.main =function(filter) {
        this.feladatId = null;
        this.taskInstanceId = null;
        var feladatDiv = WWWWWW.tartalom.openLayer();
        var oEngine = new JSCL.Engine.Generator();
        oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
        oEngine.setParameter("cmd", "FeladatFolytatasRF");
        if (isUndef(filter)) {
          filter = "V";
        }
        oEngine.setParameter("filter", filter);
        var src = oEngine.generateSrc(feladatDiv.id);
        eval(src);
      }
      publ.feladatId;
      publ.feladatName;
      publ.taskInstanceId;
      publ.cancel = function() {
        WWWWWW.tartalom.closeLayer();
        this.feladatFomenu();
      }
      publ.COLUMNS = {
        "Head" : 0,
        "Data" : 1,
        "Type" : 2
      };
      publ.letolt = function(targetElm, ds, oszlopok) {
        var most1 = new Date();
        var grid = new JSCL.UI.Tablegrid("FeladatFolytatasGrid");
        if (typeof targetElm == "undefined") {
          targetElm = "";
        }
        grid.id = "grid" + targetElm;
        grid.setData(ds);
        grid.height = getGridHeight(50)+"px";
        grid.columnsCount = oszlopok.length-1;
        grid.columnsHead = function(i) {
          return oszlopok[i][publ.COLUMNS.Head];
        }
        grid.columnsData = function(i) {
          return oszlopok[i][publ.COLUMNS.Data];
        }
        grid.columnsType = function(i) {
          return oszlopok[i][publ.COLUMNS.Type];
        }
        var self = this;
        grid.onRowClick = function(i) {
          WWWWWW.feladat.feladatId = ds.getField('Id');
          self.clearFeladatFolytatas();
          WWWWWW.tartalom.closeLayer();
          var dbLock = new JSCL.Database.Database();
          dbLock.setData(dbLock.SOURCETYPE.URL, "Command");
          dbLock.setParameter("cmd", "FeladatLock");
          dbLock.setParameter("Id", WWWWWW.feladat.feladatId);
          var errLock = new JSCL.Database.Errors(dbLock);
          dbLock.retrieveData();
          if (errLock.isError()) {
            var errC = errLock.getCount();
            for (var i = 1; i <= errC; i++) {
            	errLock.setPosition(i);
              logger.debug(errLock.getCode()+'-'+errLock.getMessage());
              alert(errLock.getCode()+'-'+errLock.getMessage());
            }
          } else {
          	WWWWWW.feladat.tevekenysegekDL();
          }
          // WWWWWW.feladat.feladatName = ds.getField('Nev');
        }
        grid.generate(targetElm);
        var most2 = new Date();
          // logger.debug(((most2-most1)/1000));
      }
      publ.kereses = function() {
        var workflow = document.getElementById('eWorkflow').jsObject.getValue();
        if (workflow == "") {
          alert("Elõször ki kell választani a workflow-t!");
        } else {
          var dbFelFoly = new JSCL.Database.Database();
          dbFelFoly.setData(dbFelFoly.SOURCETYPE.URL, "Command");
          dbFelFoly.setParameter("cmd", "FeladatFolytatasXml");
          dbFelFoly.setParameter("Name", workflow);
          dbFelFoly.setFormParameters(document.getElementById('FeladatFolytatasForm').jsObject, true);
          var errFelFoly = new JSCL.Database.Errors(dbFelFoly);
          dsFelFoly = new JSCL.Database.Datasource("FeladatFolytatas", dbFelFoly);
          dsFelFoly.name = "Row";
          dbFelFoly.retrieveData();
          if (errFelFoly.isError()) {
            var errC = errFelFoly.getCount();
            for (var i = 1; i <= errC; i++) {
              errFelFoly.setPosition(i);
              logger.debug(errFelFoly.getCode()+'-'+errFelFoly.getMessage());
              alert(errFelFoly.getCode()+'-'+errFelFoly.getMessage());
            }
          } else {
            logger.debug("Hossz: "+this.gridColumns.length);
            if (this.gridColumns.length > 0) {
              this.letolt('FeladatFolytatasGridDiv', dsFelFoly, this.gridColumns);
            } else {
              var oszlopok = [["Leírás", "Nev", "String"]];
              this.letolt('FeladatFolytatasGridDiv', dsFelFoly, oszlopok);
            }
          }
        }
      }
      publ.feladatFomenu = function() {
        // WWWWWW.menu.ClearMenuFrame();
        // WWWWWW.bulletin.BulletinDL();
        // WWWWWW.info.InfoDL();
        WWWWWW.feladat.feladatUnlock();
        WWWWWW.exit();
        Ring.main(false);
        // WWWWWW.menu.FoMenuDL();
      }
      publ.clearFeladatFolytatas = function() {
        var feladatFolytatasDiv = document.getElementById('FeladatFolytatasDiv');
        clearNodeList(feladatFolytatasDiv);
        feladatFolytatasDiv.innerText = "";
        var feladatFolytatasGridDiv = document.getElementById('FeladatFolytatasGridDiv');
        clearNodeList(feladatFolytatasGridDiv);
        feladatFolytatasGridDiv.innerText = "";
      }
      publ.onChangedParameter = function(src) {
        var workflow = document.getElementById('eWorkflow').jsObject.getValue();
        this.clearFeladatFolytatas();
        if (workflow != "") {
          var oEngine = new JSCL.Engine.Generator();
          oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
          oEngine.setParameter("cmd", "FeladatFolytatas2RF");
          oEngine.setParameter("Name", workflow);
          var src = oEngine.generateSrc("FeladatFolytatasDiv");
          eval(src);
        }
      }
    });;
JSCL.namespace("RingDokuMan");

RingDokuMan.main = function(azon, isRedirect) {
  var target = "Command?cmd=FileDownload&t="+new Date().getTime()+"&fileId="+azon;
  RingDokuMan.handle(isRedirect, target);
};

RingDokuMan.main2 = function(azon, provIdConvType, isRedirect) {
  var provId = "RingScriptSQLSelector";
  var target = "Command?cmd=FileDownload&t="+new Date().getTime()+"&fileId="+azon+"&provId="+provId+"&provIdConvType="+provIdConvType;
  RingDokuMan.handle(isRedirect, target);
};

RingDokuMan.main3 = function(azon, provId, provIdConvType, isRedirect) {
  var target = "Command?cmd=FileDownload&t="+new Date().getTime()+"&fileId="+azon+"&provId="+provId+"&provIdConvType="+provIdConvType;
  RingDokuMan.handle(isRedirect, target);
};

RingDokuMan.blobDownload = function(isRedirect, formgen, blobfield, isCompressed, filename) {
  var kulcs = formgen.dsWF.getField('workflowKulcsmezo');
  if(kulcs == '' || kulcs == null) {
	  kulcs = formgen.dsWF.getField('WORKFLOWKULCSMEZO');
  }
  var dataId = formgen.dsWF.getField(kulcs);
  var x = blobfield + "|" + dataId + "|" + formgen.windowId + "|" + filename;;
  x = encode64(x);
  var target = "Command?cmd=FileDownload&t="+new Date().getTime()+"&fileId="+dataId+"&provId=blob" + (isCompressed ? 'Compressed' : '') + "&provIdConvType="+x;
  RingDokuMan.handle(isRedirect, target);
};

RingDokuMan.main5 = function(isRedirect, formgen, blobfield, filename) {
  var kulcs = formgen.dsWF.getField('workflowKulcsmezo');
  var dataId = formgen.dsWF.getField(kulcs);
  var x = blobfield + "|" + dataId + "|" + formgen.windowId + "|" + filename;
  x = encode64(x);
  var target = "Command?cmd=XPathDownload&t="+new Date().getTime()+"&fileId="+dataId+"&provId=blob" + (isCompressed ? 'Compressed' : '') + "&provIdConvType="+x;
  RingDokuMan.handle(isRedirect, target);
};
	
RingDokuMan.handle = function(isRedirect, target) {
  if(!isRedirect) {
    window.open(target, "", "location=no,menubar=no,resizable=yes,toolbar=no,scrollbars=no,status=yes");
  } else {
    if(msie) {
      temp = window.onbeforeunload;
      window.onbeforeunload = null;
    }
    window.location = target;
    if(msie) {
	  window.onbeforeunload = temp;
	} 
  }
};
JSCL.UI.FileUpload = JSCL.Lang.Class("JSCL.UI.FileUpload", JSCL.UI.DBComponent,
    function(publ, supr) {
      var self = publ;
      publ.formAzon = null;
      publ.frameAzon = null;
      publ.idAzon = null;
      publ.nevAzon = null;
      publ.bUpload = null;
      publ.init = function(id, szulo, f, kotelezo) {
        this.calcParent(szulo);
        var embDiv = document.createElement("SPAN");
        embDiv.className = "addedTexts";
        this.parent.appendChild(embDiv);
        this.formAzon = id + "Form";
        this.frameAzon = id + "Frame";
        this.idAzon = f.idfield;
        this.nevAzon = f.namefield;
        var frmUpload = document.createElement("FORM");
        frmUpload.name = this.formAzon;
        frmUpload.id = this.formAzon;
        frmUpload.encoding = "multipart/form-data";
        frmUpload.method = "post";
        frmUpload.target = this.frameAzon;
        frmUpload.action = "Command";
        frmUpload.inProgress = false;
        embDiv.appendChild(frmUpload);
        var hiddenCmd = document.createElement("INPUT");
        hiddenCmd.type = "hidden";
        hiddenCmd.name = "cmd";
        hiddenCmd.id = "cmd";
        hiddenCmd.value = "FileUploadXml";
        frmUpload.appendChild(hiddenCmd);
        var hiddenFileProvId = document.createElement("INPUT");
        hiddenFileProvId.type = "hidden";
        hiddenFileProvId.name = "fileProvId";
        hiddenFileProvId.id = "fileProvId";
        hiddenFileProvId.value = f.fileProvId;
        frmUpload.appendChild(hiddenFileProvId);
        this.view = document.createElement("INPUT");
        this.view.type = "file";
        if(f.condFailMessage) {
        	this.condFailMessage = f.condFailMessage;
        }
        if(f.uploadCondition) {
        	this.uploadCondition = new Function(decode64(f.uploadCondition));
        }
        frmUpload.appendChild(this.view);
        this.view.jsObject = this;
        this.bUpload = new JSCL.UI.Button(id + "Upload", embDiv, {
              id : id + "Upload",
              caption : "Feltölt",
              style_width : "55px"
            }, '');
        this.bUpload.view.gazda = this;
        this.bUpload.view.onclick.Add(function(src, ea) {
        	    src.disabled = true;
        	  if(src.gazda.uploadCondition != null) {
        		  if(src.gazda.uploadCondition()) {
        			  src.gazda.uploadEvent();
        		  } else {
        			  window.alert(src.gazda.condFailMessage);
        		  }
        	  } else {
        		  src.gazda.uploadEvent();
        	  }
            });

        supr(this).init(id, f, kotelezo);
        this.view.name = "txtFile";
        this.view.id = "txtFile";
      }
      publ.uploadCondition = null;
      publ.condFailMessage = "A feltöltés követelményei nem teljesülnek!";
      publ.onReposition = function() {

      }
      publ.onNecessity = function() {
		  /*var isblob = /.*BlobUpload$/g;
		  if(isblob.test(this.id)) {
			  if(this.uploadCondition != null) {
	    		  if(this.uploadCondition()) {
	    			  this.uploadEvent();
	    		  } else {
	    			  window.alert(this.condFailMessage);
	    		  }
	    	  } else {
	    		  this.uploadEvent();
	    	  }
	        }*/
      }
      publ.getValue = function() {
        return (this.view.value);
      }
      publ.dataRefresh = function(e) {
     		e = e || window.event;
      	elem = e.target || e.srcElement;
        var self = elem.gazda;
        var frame = document.getElementById(self.frameAzon);
        var r = { // bogus response object
          responseText : '',
          responseXML : null
        };
        try { //
          var doc;
          if (msie) {
            doc = frame.contentWindow.document;
          } else {
            doc = (frame.contentDocument || window.frames[self.frameAzon].document);
          }
          if (doc && doc.body) {
            r.responseText = doc.body.innerHTML;
          }
          if (doc && doc.XMLDocument) {
            r.responseXML = doc.XMLDocument;
          } else {
            r.responseXML = doc;
          }
        } catch (e) {
          alert(e);
        }
        var dbResp = new JSCL.Database.Database();
        dbResp.setData(dbResp.SOURCETYPE.TEXT,
            getXmlAsString(r.responseXML));
        var dsResp = new JSCL.Database.Datasource("FileUpload", dbResp);
        dsResp.name = "Row";
        var errResp = new JSCL.Database.Errors(dbResp);
        dbResp.retrieveData();
        if (errResp.isError()) {
          var errC = errResp.getCount();
          for (var i = 1; i <= errC; i++) {
            errResp.setPosition(i);
            alert(errResp.getCode() + '-' + errResp.getMessage());
          }
        } else {
          dsResp.goToFirst();
          var idElem = document.getElementById(self.idAzon);
          idElem.value = dsResp.getField('Id');
          var nevElem = document.getElementById(self.nevAzon);
          if(nevElem != null) {
        	  nevElem.value = dsResp.getField('Nev');
          }
        }
        self.bUpload.view.disabled = false;
        frame.parentNode.removeChild(frame);
      }

      publ.uploadEvent = function() {
        if (this.getValue() != '') {
          var SSL_SECURE_URL = "javascript:false";
          var frame = document.createElement('iframe');
          frame.id = this.frameAzon;
          frame.name = this.frameAzon;
          frame.className = 'x-hidden';
          frame.height = "0";
          frame.width = "0";
          frame.frameBorder = "0";
          frame.scrolling = "yes";
          if (msie) {
            frame.src = SSL_SECURE_URL;
          }
          document.body.appendChild(frame);
          if (msie) {
            document.frames[this.frameAzon].name = this.frameAzon;
          }
          frame.gazda = this;
          addE(frame, 'load', this.dataRefresh);
          // frame.onload = (new JSCL.Events.Listener()).Invoke;
          // frame.onload.Add(function(src, ea) {
          // alert("ssss");
          // src.gazda.dataRefresh();
          // });
          var formUL = document.getElementById(this.formAzon);
          formUL.submit();
        } else {
          alert('Nincs kiválasztva fájl a feltöltéshez.');
        }
      }

    });;
JSCL.namespace("JSCL.UI.WindowValidation");

JSCL.UI.WindowValidation.main = function(taskInstanceId, windowId, validationBean, batchId, businessSystem) {
	var db = new JSCL.Database.Database();
	db.setData(db.SOURCETYPE.URL, "Command");
	db.setParameter("cmd", "WindowValidationXml");
	db.setParameter("taskInstanceId", taskInstanceId);
	db.setParameter("validationBean", validationBean);
	db.setParameter("batchId", batchId);
	db.setParameter("businessSystem", businessSystem);
	db.setParameter("windowId", windowId);
	
	var errFeloldo = new JSCL.Database.Errors(db);
	var ds = new JSCL.Database.Datasource("Hibalista", db);
	ds.name = "Row";
	db.retrieveData();

	if (errFeloldo.isError()) {
		var errC = errFeloldo.getCount();
		for ( var i = 1; i <= errC; i++) {
			errFeloldo.setPosition(i);
			logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
			alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
		}
	} else {
	    var removeme = document.getElementById("remove-me");
		var parentDiv = removeme.parentNode;
		parentDiv.removeChild(removeme);
		var pTitle = document.createElement("P");
		parentDiv.appendChild(pTitle);
		if(ds.getCount() == 0) {
		  pTitle.appendChild(document.createTextNode(' Az ügyletben nem talált hibát az ellenörzés '));
		  pTitle.className = 'UgyletEllenorzesOK';
		  var iTick = document.createElement("IMG");
		  iTick.src = 'files/tick.png';
		  pTitle.appendChild(iTick);
		} else {
			addStyledText(pTitle, 'Az ellenörzés eredménye:', "UgyletEllenorzesOK");
			var tTable = document.createElement("TABLE");
			parentDiv.appendChild(tTable);
			var tBody = document.createElement("TBODY");
			tTable.appendChild(tBody);
			var tTr = document.createElement("TR");
			tBody.appendChild(tTr);
			addTextMezo(tTr, 'Ablak', "UgyletEllenorzesMezo");
			addTextMezo(tTr, 'Mezö', "UgyletEllenorzesMezo");
			addTextMezo(tTr, 'Eredmény', "UgyletEllenorzesMezo");
			for ( var i = 1; i <= ds.getCount(); i++) {
				ds.setPosition(i);
				var tTr = document.createElement("TR");
				tBody.appendChild(tTr);
				addTextMezo(tTr, ds.getField("ABLAK"), "UgyletEllenorzesMezo");
				addTextMezo(tTr, ds.getField("MEZO"), "UgyletEllenorzesMezo");
				addTextMezo(tTr, ds.getField("HIBA"), "UgyletEllenorzesHiba");
			}
		}

	}
}
JSCL.namespace("JSCL.UI.WindowDocPrint");

JSCL.UI.WindowDocPrint.main = function(processInstanceId, taskInstanceId, windowId, select) {
	
	var oEngine = new JSCL.Engine.Generator();
    oEngine.setData(oEngine.SOURCETYPE.URL, "Command");
    oEngine.setParameter("cmd", "WindowDocPrintRF");
    oEngine.generate("doc-window-target-div-" + windowId);
    
    var db = new JSCL.Database.Database();
	db.setData(db.SOURCETYPE.URL, "Command");
	db.setParameter("cmd", "WindowDocPrintXml");
	db.setParameter("processInstanceId", processInstanceId);
	db.setParameter("taskInstanceId", taskInstanceId);
	db.setParameter("select", select);
    
	var errFeloldo = new JSCL.Database.Errors(db);
	ds = new JSCL.Database.Datasource("Result", db);
	ds.name = "Row";
	db.retrieveData();
	
	var tBody = document.getElementById("window-docprint-tbody");
	
	if (errFeloldo.isError()) {
		var errC = errFeloldo.getCount();
		for (var i = 1; i <= errC; i++) {
			errFeloldo.setPosition(i);
			logger.debug(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
			alert(errFeloldo.getCode() + "-" + errFeloldo.getMessage());
		}
	} else {
		var chk_ids = "";
		for(var i = 1; i <= ds.getCount(); i++) {
		    ds.setPosition(i);
		    
		    var tTr = document.createElement("TR");
			tBody.appendChild(tTr);
			
			var td1 = document.createElement("td");
			td1.style.cssText = td1.style.cssText + ";text-align: center;"; 
			tTr.appendChild(td1);
			
			var tCb = document.createElement("input");
			tCb.type = "checkbox";
			tCb.id = "isReq" + ds.getField('DocId');
			chk_ids = chk_ids + (chk_ids.length > 0 ? "," : "") + tCb.id;
			td1.appendChild(tCb);
			tCb.checked = (ds.getField('Required') == 'true');
			
			addTextMezo(tTr, (tCb.checked ? "*" : "") + ds.getField('Label') , (tCb.checked ? "docprint-doctitle-req" : "docprint-doctitle"));
			
			var td3 = document.createElement("td");
			tTr.appendChild(td3);
			
			var tA = document.createElement("a");
			tA.id = "btnPrint" + ds.getField('DocId');
			tA.className = "button";
			tA.href="#";
			tA.innerText = "Nyomtatás";
		    tA.style.cssText = tA.style.cssText + ";width: 100px;";
		    var s = ds.getField('PrintBtnScript');
		    tA.onclick = new Function(s);
			
			td3.appendChild(tA);
		  }
		
		var footer = document.getElementById("docprint-footer");
		
		var tV = document.createElement("a");
		footer.appendChild(tV);
		tV.className = "button";
		tV.href="#";
		tV.innerText = "Vissza";
		tV.style.cssText = tV.style.cssText + ";width: 80px;display: inline;margin-bottom: 10px;margin-right: 20px;";
		tV.onclick = function() {
			WWWWWW.tartalom.closeLayer();
		}
		
		var tB = document.createElement("a");
		footer.appendChild(tB);
		tB.className = "button";
		tB.href="#";
		tB.innerText = "Mindet kijelöli";
		tB.style.cssText = tB.style.cssText + ";width: 100px;display: inline;margin-bottom: 10px;margin-right: 20px;";
		tB.onclick = function() {
			JSCL.UI.WindowDocPrint.checkAll(chk_ids);
		}
		
		var tA = document.createElement("a");
		footer.appendChild(tA);
		tA.className = "button";
		tA.href="#";
		tA.innerText = "Kijelöltek nyomtatása";
		tA.style.cssText = tA.style.cssText + ";width: 170px;display: inline;margin-bottom: 10px;";
		tA.onclick = function() {
			JSCL.UI.WindowDocPrint.printAllChecked(chk_ids);
		}
		
		footer.appendChild(document.createElement("p"));
	}
    
}

JSCL.UI.WindowDocPrint.checkAllState = true;

JSCL.UI.WindowDocPrint.checkAll = function(chkids) {
	var ids = chkids.split(',');
	for(var i in ids) {
		if(typeof(ids[i]) == 'string') {
			document.getElementById(ids[i]).checked = JSCL.UI.WindowDocPrint.checkAllState;
		}
	}
	JSCL.UI.WindowDocPrint.checkAllState ^= 1;
}

JSCL.UI.WindowDocPrint.printAllChecked = function(chkids) {
	var ids = chkids.split(',');
	for(var i in ids) {
		if(typeof(ids[i]) == 'string') {
			if(document.getElementById(ids[i]).checked) {
				var x = ids[i].substring(5,ids[i].length);
				var targetA = document.getElementById("btnPrint" + x);
				targetA.onclick();
			}
		}
	}
}
/* json2.js
 * 2008-01-17
 * Public Domain
 * No warranty expressed or implied. Use at your own risk.
 * See http://www.JSON.org/js.html
*/
if(!this.JSON){JSON=function(){function f(n){return n<10?'0'+n:n;}
Date.prototype.toJSON=function(){return this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z';};var m={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'};function stringify(value,whitelist){var a,i,k,l,r=/["\\\x00-\x1f\x7f-\x9f]/g,v;switch(typeof value){case'string':return r.test(value)?'"'+value.replace(r,function(a){var c=m[a];if(c){return c;}
c=a.charCodeAt();return'\\u00'+Math.floor(c/16).toString(16)+
(c%16).toString(16);})+'"':'"'+value+'"';case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
if(typeof value.toJSON==='function'){return stringify(value.toJSON());}
a=[];if(typeof value.length==='number'&&!(value.propertyIsEnumerable('length'))){l=value.length;for(i=0;i<l;i+=1){a.push(stringify(value[i],whitelist)||'null');}
return'['+a.join(',')+']';}
if(whitelist){l=whitelist.length;for(i=0;i<l;i+=1){k=whitelist[i];if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}else{for(k in value){if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}
return'{'+a.join(',')+'}';}}
return{stringify:stringify,parse:function(text,filter){var j;function walk(k,v){var i,n;if(v&&typeof v==='object'){for(i in v){if(Object.prototype.hasOwnProperty.apply(v,[i])){n=walk(i,v[i]);if(n!==undefined){v[i]=n;}}}}
return filter(k,v);}
if(/^[\],:{}\s]*$/.test(text.replace(/\\./g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof filter==='function'?walk('',j):j;}
throw new SyntaxError('parseJSON');}};}();}

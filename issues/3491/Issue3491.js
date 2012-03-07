
window.Controller =
{
   TriggerBreakpoint : function()
   {
      // place breakpoint here
      var a = 1;
      ++a;
   },
   ReloadScript : function()
   {
      var obj = new XMLHttpRequest();
      obj.open("get", "Issue3491.js?uid=" + Math.random(), false);
      obj.send(null);
      eval(obj.responseText);
   }
};

//@sourceURL=http://legoas/firebug/tests/issues/3491/Issue3491.js"
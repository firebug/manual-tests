function callback()
{
  self.postMessage("Hello Firebug user!");
}

setTimeout(callback, 3000);
Firebug 1.3.x Frame Replacement issue.

Summary:

When you dynamically replace frames in a nested frameset.  Scripts loaded
by the nested frames sometimes DO NOT show up in the Firebug "Script" list.

The application works normally but you cannot debug the scripts loaded
by the nested pages.

In my applcation there seemed to be different behavior for frames replaced
with parent.frames[i].location.href="somefile.html" and 
parent.frames[i].location.replace("somefile.html").  

In one case (using location.href=) the scripts would not appear in the script list. While
when using location.replace() the scripts would be in the script list, but no lines of the
script would be marked as executable (so you could not set breakpoints or step through them)

In this trivial test case the behavior seems to be reversed. I have only included a test for
loading the frame with location.replace().

In my application all of this replacement is handled by Deluxe-Menu I tried to make
the test case work the same way, but had trouble understanding their code.

To recreate the issue

1. load index.html in the browser
2. click on "Replace Bottom Frame" 
3. The bottom-left frame will change.
4. Click on "Load Content"
5. The bottom-right frame will change.
6. In the bottom-right frame click "Show Alert" You should get an alert.
7. Check the Firebug "Script" list for "loadContent.js".
8. loadContent.js will not be in the script list even though
   you can call the "loadContentClick()" defined in that file.
   




function runTest()
{
    FBTest.sysout("issue2710.START");

    // 1) Load test case page
    FBTestFirebug.openNewTab(basePath + "net/2710/issue2710.html", function(win)
    {
        // 2) Open Firebug and enable the Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel(function(win)
        {
            // 3) Select Net panel
            var panel = FW.FirebugChrome.selectPanel("net");

            // 4) Execute test by clicking on the 'Execute Test' button.
            FBTest.click(win.document.getElementById("testButton"));

            // 5) TODO: Test driver code (can be asynchronous)

            // 6) Finish test
            FBTestFirebug.testDone("issue2710.DONE");
        });
    });
}

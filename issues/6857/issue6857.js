function runTest()
{
    FBTest.sysout("issueXXXX.START");

    FBTest.openNewTab(basePath + "category/XXXX/issueXXXX.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("mainPanel");

        FBTest.doSomething(function(win)
        {
            // Test functionality must be placed here

            FBTest.testDone("issueXXXX.DONE");
        });
    });
}


var counter = 3;
var imc = new Class(
{
    request : function ()
    {
        var jsonRequest = new Request.JSON(
        {
            noCache: true,
            url: 'firebug.php',
            onSuccess: function(answer)
            {
                if (--counter>0)
                {
                    console.log('there are still products, let us match agian');
                    //setTimeout(function() {
                        jsonRequest.send();
                    //}, 500);
                }
                else
                {
                    console.log('Matchin complete');
                }
            },
            onFailure: function(xhr)
            {
                console.log(xht);
            }
        });
        jsonRequest.send();
    }
});
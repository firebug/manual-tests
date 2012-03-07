function addIFrame()
{
    if (!document.getElementById("iframe"))
    {
        var iframe = document.createElement("iframe");
        iframe.id = "iframe";
        iframe.src = "issue4248-iframe.html";
        document.getElementById("content").appendChild(iframe);
    }
}

function removeIFrame()
{
    var iframe = document.getElementById("iframe");
    if (iframe)
        iframe.parentNode.removeChild(iframe);
}

function sayHello()
{
    if (!document.getElementById("hello"))
    {
        var helloMsg = document.createElement("p");
        helloMsg.setAttribute("id", "hello");
        helloMsg.textContent = "Hello everybody!";
        document.body.appendChild(helloMsg);
    }
}
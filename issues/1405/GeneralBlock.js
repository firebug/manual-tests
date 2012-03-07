var dialogArgumentsForChild = null; 
var ModalDialog = new Object();
ModalDialog.value = null;

var closeFceBackup = window.close; 
window.close = function () {
    window.top.returnValue = window.returnValue;
    if (window.top.close != window.close)
        window.top.close();
    else 
        closeFceBackup();
}
function ShowModalWindowEx(url, title, width, height, status, resizable, scroll, WPID){
    dialogArgumentsForChild = new Object();
    dialogArgumentsForChild.window = window;
    dialogArgumentsForChild.sPage = url;
    dialogArgumentsForChild.sTitle = title;
    dialogArgumentsForChild.WPID = WPID; 
    var left = (window.screen.width - width) / 2;
    var top = (window.screen.height - height) / 2;
        var windowArgs = "dialogHeight:"+height+"px;dialogWidth:"+width+"px; dialogTop="+top+"px; dialogLeft="+left+"px; center:yes; status:"+(status?"yes":"no")+";resizable:"+(resizable?"yes":"no")+";scroll:"+(scroll?"yes":"no");
        var oReturn = window.showModalDialog(
              'ModalWindow.htm',
              dialogArgumentsForChild,
              windowArgs
        );
        return oReturn;
}

 

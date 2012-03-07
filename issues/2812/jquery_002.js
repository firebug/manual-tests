/*global document jQuery*/
;(function($) {

    $.dialog = {};

    // find the dialog element on the page
    var element;
    $(document).ready(function() {
        element = $('#fd_dialog').hide();
    });

    function buildDialog() {
        $('#fd_dialog div.dialog_container').remove();
        var content = [
            '<div class="dialog_container">',
            '<label></label>',
            '<p></p>',
            '<div class="buttonspace"></div>',
            '<div class="clear"></div></div>'
        ];
        element.hide().append(content.join(""));
    }


    // buttons
    function addButton(button, click_func) {
        var buthtml = $('<input type="button" id="'+button+'but" class="button_grey" value="'+button+'" />').click(function() {
            $.dialog.close();
            click_func();
        });
        $('.buttonspace', element).append(buthtml);
    }
    function clearButtons() {
        $('.buttonspace', element).empty();
    }

    // open & close the dialogs 
    $.dialog.open = function(label, message, buttons) {
        buildDialog();
        clearButtons();
        $.each(buttons, function(caption, func){ 
            addButton(caption, func);
        });
        $('.dialog_container p', element).html(message);
        $('.dialog_container label', element).html(label);
        $('#overlay').show();
        element.fadeIn(1000);
    };
    $.dialog.close = function() {
        $('#overlay').hide();
        element.fadeOut(200).removeClass('over');
    };

    $.dialog.yesno = function(message, success_func, label) { 
        if( !label ) { label='Confirm'; }
        var buttons = {
            "Yes": function(){ success_func(); },
            "No": function(){}
        };
        $.dialog.open(label, message, buttons); 
    };

})(jQuery);

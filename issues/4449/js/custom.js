(function($) {
        $(document).ready(function() {
			if ($('select[name="country"]').length) {
				var last_state = "AL";
				if ($('input[name="type"]').val() == 'modify') {
					if ($('select[name="country"]').val() != 'US') {
						$('select[name="state"]').val('00');
						$('select[name="state"]').attr('disabled', 'disabled');
					} else {
						last_state = $('select[name="state"]').val();
					}
				}
				$('select[name="country"]').change(function(obj) {
					if ($(obj.target).val() == 'US') {
						$('select[name="state"]').val(last_state);
						$('select[name="state"]').removeAttr('disabled');
					} else {
						if ($('select[name="state"]').val() != '00') {
							last_state = $('select[name="state"]').val();
							$('select[name="state"]').val('00');
							$('select[name="state"]').attr('disabled', 'disabled');
						}
					}
				});
			}
	});
})(jQuery);

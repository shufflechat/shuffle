$(function() {
	$('.handle-request').click(function(event) {
		console.log($(this).parent('.request-decision'));
		console.log($(this).parents('.request-decision'));
	})
});
function add_tags() {
	var tags = $('#new_tags').val();
	var user_id = $('#user_id').html();

	if (tags != "") {
		tags = tags.split(",");
	}

	// Trim all leading and trailing white space for each tag before sending to server side
	for (var i = 0; i < tags.length; i++) {
		tags[i] = $.trim(tags[i]);	
	}

	// AJAX POST request to server to create tags
	$.ajax({
		url: '/new_tags',
		type: 'post',
		dataType: 'json',
		data: { 'tags': tags, 'user_id': user_id },
		success: function(data) {
			console.log('Successfully updated tags');
		}
	})
}

function add_friend() {
	var curr_user_id = $('#current_user_id').html();	// the logged-in user
	var user_id = $('#user_id').html();		// the user in the params
	// note that they won't equal due to client side logic

	var data = {
		type: 'add',
		curr_user_id: curr_user_id,
		user_id: user_id
	};
	
	$.ajax({
		url: '/users/friendship', 
		type: 'post', 
		dataType: 'json',
		data: data,
		success: function(data) {
			console.log(data);
		}
	})
}


$(function() {
	$('#add_tags').click(function() { add_tags(); });
	$('#add_friend').click(function() { add_friend(); });
});
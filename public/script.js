
var socket = io.connect();

// Add a message to the screen with the user's nickname
function add_message(msg, nickname, room_id) {
	var to_print = '<div class="message"><p>' + nickname + ' : ' + msg + '</p></div>';

	// TODO - find the conversation history object
	var convo = $('#' + room_id)
	console.log(convo);

	var chat_entries = $(convo).find('.chat-entries');
	chat_entries.append(to_print);
}

// Call this function when we want to send a new message
function send_message(room_id, new_message) {
	// First verify that the textarea is not empty
	if (new_message.val() != "") {
		socket.emit('message', { body: new_message.val(), room_id: room_id });
		add_message(new_message.val(), "Me", room_id);
		new_message.val('');
	}
}

// Set the user's nickname, join the lobby.
function join_lobby() {
	var email = $('#user_email').html();
	socket.emit('nickname', $("#nickname_input").val());

	// Make chatting input available only after the user has entered a nickname
	$('.convo').show();
	$('#nickname_input').hide();
	$('#user_email').hide();
	$('#nickname_set').hide();

	// Emit a "join" event to the server, passing the user email
	socket.emit('join', email);
	$('#shuffle').show();
}

socket.on('message', function(data) {
	add_message(data['message'], data['nickname'], data['room_id']);
});



// Can These two events merge into one, and let the server handle it?
// When the shuffling starts, change the UI accordingly 
socket.on('shuffle_start', function() {
	$('.loading').show();
	// TODO - timeout after 10 seconds. Prompt the user to retry
});
socket.on('create_room_success', function(room_id) {
	console.log('ID of newly created room: ', room_id);	

	socket.emit('shuffle', $('#user_id').html(), room_id);
});



socket.on("merge_success", function(room_id) {
	$('.loading').hide();

	// Show the conversation form
	$('.convo').show();

	// Create the conversation
	var new_convo = '<div class="convo active" id="' + room_id.toString() + '">';	// start div
	new_convo += '<div class="hidden room-id">' + room_id.toString() + '</div>';
	new_convo += '<div class="chat-box"><div class="chat-entries">' + 'Dummy Entries' + '</div><input type="text" class="message-input" /><button class="send-message">Send</button></div>';
	new_convo += '<div class="chat-min hidden">Minimized Chat</div>';

	new_convo += '</div>';		// close div

	$('#all_convo').append(new_convo);
});

var init_page = function() {
	$('#shuffle').hide();
	$('.loading').hide();	// hide GIF - loading for shuffling

	// Binding other onclick event listeners
	$('#nickname_set').click(function() { join_lobby(); });		// Set the nickname and join the room
	$('#shuffle').click(function() { socket.emit('create_room', $('#user_id').html()); });	// This creates a room, and the success event emitted from the server will trigger the shuffling.
};

$(function() {
	init_page();

	// Bind an onclick listener to the dynamically-created button in the future.
	// Note that you can only send message in an active convo
	$('#all_convo').on('click', '.send-message', function() {
		var room_id = $(this).parents('.convo.active').children('.room-id').html();
		// var convo_history = $(this).parents('.convo.active').find('.chat-entries');		
		var new_message = $(this).parents('.convo.active').find('.message-input');		

		// Note: We're getting  new_message as jquery DOM object
		// This way, both can be updated
		send_message(room_id, new_message); 
	});
	
	// TODO - implement the set active convo feature
});
/* 
Advanced Node.js and Socket.io rooms: http://tamas.io/advanced-chat-using-node-js-and-socket-io-episode-1/

Simple Chat Service: http://code.tutsplus.com/tutorials/using-nodejs-and-websockets-to-build-a-chat-service--net-34482

MEAN stack: http://pluralsight.com/training/Courses/TableOfContents/building-angularjs-nodejs-apps-mean?utm_campaign=newsletter_20140211&utm_source=newsletter&utm_medium=email&utm_term=course

User model and Authentication: http://scotch.io/tutorials/javascript/easy-node-authentication-setup-and-local

User Authentication with Passport.js:  http://mherman.org/blog/2013/11/11/user-authentication-with-passport-dot-js/#.UxP5bPRDuSo

Social Authentication with Passport.js: http://mherman.org/blog/2013/11/10/social-authentication-with-passport-dot-js/#.UxP5iPRDuSo

REST API with Node and MongoDB: http://coenraets.org/blog/2012/10/creating-a-rest-api-using-node-js-express-and-mongodb/
*/

// HTML to Jade Converter:  http://html2jade.org/


var express = require('express'), app = express();
var http = require('http'), server = http.createServer(app);
// var jade = require('jade');
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var uuid = require('node-uuid');

var port = process.env.PORT || 3000;
var User = require('./app/models/user');	// load the User model
var Room = require('./app/models/room')

// MongoDB Configuration.  Use Robomongo for an admin UI
var configDB = require('./config/database.js');
// var Db = require('mongodb');

mongoose.connect(configDB.url, function(err, db) {
	if (!err) {
		console.log("Conencted to MongoDB.");
	}	
});		// connect to our database

require('./config/passport')(passport);		// pass passport for configuration

app.configure(function() {
	// Set up our express application
	app.use(express.logger('dev'));		// Log every request to the console
	app.use(express.cookieParser());	// Read cookies (needed for auth)
	app.use(express.bodyParser());		// get information from html forms
	app.use(express.query());

	// required for passport
	app.use(express.session({ secret: '1234567QWERTY' }));	// session secret
	app.use(passport.initialize());
	app.use(passport.session());	// persistent login sessions
	app.use(flash());	// use connect-flash for flash messages stored in session
});

// routes 
require('./config/routes.js')(app, passport);	// load our routes and pass in our app and fully configured passport


// Serve static content to the client, so we will send a "public" folder which will contain our JS, CSS, and image files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');	// Using ejs instead, since it supports logic.  app.set('view engine', 'jade');
app.set('view options', { layout: false });
app.configure(function() {
	app.use(express.static(__dirname + '/public'));
});



// All information needed to get Rooms working
// Handle the Chat with socket connection
var room_ids = [];
var all_rooms = {};
var clients = [];		// In Socket IO 0.7, we can simply do   var clients = io.sockets.clients();  to get an array of all connected sockets, or specifically in a room:   io.sockets.clients('room')

io.sockets.on('connection', function(socket) {
	socket.on("join", function(email) {
		User.findOne({'local.email': email }, function(err, user) {
			if (user) {		// Check if user already exists
				socket.get('nickname', function(error, nickname) {		
					console.log("User " + user.id.toString() + " joined the lobby.");
				});
			}
		});
	});

	socket.on("create_room", function(user_id) {
		var room_id = uuid.v4();		// creates a universally unique identifier
		var room = new Room(room_id, socket.id);

		// Copy all the user's tags to the room
		User.findOne({'_id': user_id}, function(err, user) {
			if (user) {		
				console.log("Creating room for user ", user.id);

				room.tags = user.tags;		// copy user tags to the room
				all_rooms[room_id] = room;		// Keep track of all rooms
				room_ids.push(room_id);		// add an array that keeps track of the order of creation of all rooms

				socket.rooms = {};
				socket.rooms[room_id] = room;	// Add the room to the client socket. This helps keep track of what rooms the user is currently in.
				socket.join(room_id);
				
				room.addPerson(socket.id);	// also add the person to the room object

				socket.emit('create_room_success', room_id);
				console.log("A new room is created for user ", user.id);
			}
		});
	});

	// Helper functions in merging 
	var union_tags = function(room_a, room_b) {
		// Compute the number of elements in the unique union set
		var union = room_a.tags;
		for (var i = 0; i < room_b.tags.length; i++) {
			if (union.indexOf(room_b.tags[i]) < 0) {	// append if not already in the union set
				union.push(room_b.tags[i]);	
			}
		}

		return union;
	};
	// Join room A, delete room B
	var merge_rooms = function(room_a, room_b, union_tags) {
		room_a.tags = union_tags;		// update the tags

		var b_socket_id = room_b.people[0]
		var socket_b = io.sockets.sockets[b_socket_id];	// TODO - verify that this line works.
		
		room_a.addPerson(b_socket_id);
		socket_b.leave(room_b.id);
		socket_b.join(room_a.id);

		console.log("Merging for room " + room_a.id + " and room " + room_b.id + " complete.");
		console.log(room_b.owner + " has joined room " + room_a.id);
		console.log("People in room " + room_a.id, room_a.people);

		// emit events for both sockets
		socket.emit("merge_success", room_a.id);
		socket_b.emit("merge_success", room_a.id);

		delete room_b;
	};

	socket.on('shuffle', function(user_id, curr_room_id) {

		socket.emit('shuffle_start', '');
		console.log('Shuffling for room ', curr_room_id);

		var curr_room = all_rooms[curr_room_id];
		for (var i = 0; i < room_ids.length; i++) {
			var target_id = room_ids[i];
			if (curr_room_id != target_id) {
				var target = all_rooms[target_id];
				
				// Compute score between the room based on tags
				curr_room.outgoing_merges.push(target_id);
				target.incoming_merges.push(curr_room_id);
			}
		}

		// EVery 0.5s, check the socket for incoming_merges merge requests
		var connected = false;
		var poll_pending = setInterval(function() {
			if (connected) {
				clearInterval(poll_pending);
			}
			else {
				for (var i = 0; i < curr_room.incoming_merges.length; i++) {
					var target = all_rooms[curr_room.incoming_merges[i]];
					var tags = union_tags(curr_room, target); 

					// For now, the threshold is 2 common tags.
					if (tags.length > 2 && curr_room.available && target.available) {
						connected = true;
						curr_room.available = false;
						target.available = false;

						merge_rooms(curr_room, target, tags);
						break;
					}
				}
			}
		}, 500);

		/*  Old method of processing both incoming and outgoing merges.
		// Too many cases to keep track of.
		var found = false;
		// Poll newly joined rooms until we've found a match
		var poll_room = setInterval(function() {
			if (found){ 	// break the setInterval timer loop 
				console.log('Successfully paired up!');
				clearInterval(poll_room);
			}

			for (var target_id in room_ids[target_id]);

					// Send an outgoing request to the target room
					if (curr_room.pending.length < 1) {
						curr_room.merge_enabled = false;	// disable incoming merging

						// Do we need a way to know whether the outgoing request is successful?



						found = true;
						break;
					}
					else {
						// Take the incoming one


					}
				}
			}
		}, 3000);	
		// IMPORTANT: if we have found a match, we need to let the outgoing ones know.  For each room in curr_room.outgoing, 
		var poll_pending = setInterval(function() {
		}, 500);
		*/
	});

	/* Testing Code
	console.log("socket before adding room: ", socket);
	console.log("All Rooms: ", io.sockets.manager.rooms);		// A hash with room name as keys, mapped to an array of socket IDs
	console.log(io.sockets.manager.roomClients[socket.id]); //should return { '': true }
	socket.rooms = {};
	socket.join('myroom');
	console.log("socket after adding room: ", socket);
	console.log(io.sockets.manager.roomClients[socket.id]); //should return { '': true, '/myroom': true }
	*/

	// Setting the chat name
	socket.on('nickname', function(data) {
		socket.set('nickname', data);
		console.log('Data from nickname: ', data);
	});

	socket.on('message', function(message) {
		// Check that the client is in the room specified by the room_id from the client-side event
		console.log("io.sockets.manager.roomClients: ", io.sockets.manager.roomClients);

		socket.get('nickname', function(error, name) {
			var data = { 'message': message.body, nickname: name, room_id: message.room_id };
			console.log(data);

			socket.broadcast.to(message.room_id).emit('message', data);	// emit to all sockets in this room, EXCEPT the sender
			
			// TODO save every incoming message to MongoDB
		});

		if (io.sockets.manager.roomClients[socket.id]['/' + socket.rooms[message.room_id]] == true) {
			console.log("YAAAY, client is in the room");	
		}
	});


	// Handle Disconnection
	// This event handler disconnects the user from one room at a time. 
	socket.on("leave_room", function(id) {
		var room = occupied_rooms[id];
		if (client.id === room.owner) {
			socket.leave(room.id);

			delete occupied_rooms[id];
		}
		else { 	
			room.people.contains(socket.id, function(found) {
				if (found) {	// Make sure that the client is in fact part of the room
					var personIndex = room.people.indexOf(client.id);
					room.people.splice(personIndex, 1);
					socket.leave(room.id);
				}
			});
		}
	});
});	


server.listen(port);
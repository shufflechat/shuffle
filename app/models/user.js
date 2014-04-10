// Load the things we need
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// Define the scheme for our user model
var userSchema = mongoose.Schema({
	local: {
		first_name: String,
		last_name: String,
		email: String,
		password: String
	},
	facebook: {
		id: String,
		token: String,
		email: String,
		first_name: String,
		last_name: String
	},
	tags: [ String ],
	friends: [ String ],	// no need for a this-referencing association table.  Simply append the user_id of each new friend to the array
	pending_requests: [ String ], 	// users to whom the current user has sent requests
	requesting_friends: [ String ]		// friends that the user needs to accept
});

// Generate a hash
userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

// Check if password is valid
userSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
}

userSchema.methods.isFriendWith = function(other_user) {
	return this.friends.indexOf(other_user.id) >= 0; 
}

// Send friend request to a new user
userSchema.methods.sendFriendRequest = function(other_user) {
	// First check if the list already contains the user
	if (this.pending_requests.indexOf(other_user.id) == -1)
		this.pending_requests.push(other_user.id)
	if (other_user.requesting_friends.indexOf(this.id) == -1)
		other_user.requesting_friends.push(this.id);
	
	this.save();
	other_user.save();
}

userSchema.methods.acceptRequest = function(other_user) {
	// Move from pending to friends
	var other_user_index = this.requesting_friends.indexOf(other_user.id);
	console.log("Index: ", other_user_index)
	this.requesting_friends.splice(other_user_index, 1);
	if (this.friends.indexOf(other_user.id) == -1)
		this.friends.push(other_user.id);

	var this_index = other_user.pending_requests.indexOf(this.id);
	console.log("Index: ", this_index);
	other_user.pending_requests.splice(this_index, 1);
	if (other_user.friends.indexOf(this.id) == -1)
		other_user.friends.push(this.id);

	this.save();
	other_user.save();
}

userSchema.methods.declineRequest = function(other_user) {
	// Remove pending requests, but do not add to friends
	var other_user_index = this.pending_requests.indexOf(other_user.id);
	this.pending_requests.splice(other_user_index, 1);

	var this_index = other_user.requesting_friends.indexOf(other_user.id);
	other_user_index.requesting_friends.splice(this_index, 1);

	this.save();
	other_user.save();
}


// Register the following routes:
/*
GET /users
GET /users/:id
POST /users
PUT /users/:id
DELETE /resources/:id
*/	

// Create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);//.methods(['get'e, 'post', 'put', 'delete']); // use node-restful// mongoose.model('User', userSchema);
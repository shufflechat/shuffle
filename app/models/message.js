// Load the things we need
var mongoose = require('mongoose');

// Define the scheme for our message model
var messageSchema = mongoose.Schema({
	body: String,
	from: ,
	tags: [ String ]
});

// Generate a hash
messageSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

// Check if password is valid
messageSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
}

// Create the model for messages and expose it to our app
module.exports = mongoose.model('User', messageSchema);
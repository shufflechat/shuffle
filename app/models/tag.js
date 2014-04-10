var mongoose = require('mongoose');
// var UserSchema = require('../models/user');	// Instead of using the schema, store a list of references

// Define the scheme for our user model
var tagSchema = mongoose.Schema({
	name: String,
	category: String,
	users: [String]		// references 
});

/* Model Methods
// Generate a hash
tagSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

// Check if password is valid
tagSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
}
*/

// Create the model for users and expose it to our app
module.exports = mongoose.model('Tag', tagSchema);
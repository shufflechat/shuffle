var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');	// load the User model

module.exports = function(passport) {

	// Used to serialize the user for the session
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});


	// =========================================================================
	// Local SIGN UP ============================================================
	// TODO - find a way to include other information such as First Name and Last Name
	passport.use('local-signup', new LocalStrategy({
		// By defualt, local strategy uses username and password, we will override with email
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true		// allows us to pass back the entire request to the callback
	},
	function(req, email, password, done) {
		// async.  User.findOne won't fire unless data is sent back
		process.nextTick(function() {
			// Find the user with the same email as the one in the form
			User.findOne({'local.email': email }, function(err, user) {
				if (err) 
					return done(err);

				if (user) {		// If the user already exists
					return done(null, false, req.flash('signupMessage', 'That email is already taken'));
				}
				else {		// no user with that email, we can create one
					var newUser = new User();
					newUser.local.email = email;
					newUser.local.password = newUser.generateHash(password);
					newUser.local.first_name = req.body.first_name;
					newUser.local.last_name = req.body.last_name;

					// Save the user
					newUser.save(function(err) {
						if (err) throw err;
						return done(null, newUser);
					});
				}
			});
		});
	}));



	// =========================================================================
	// Local Signup ============================================================
	passport.use('local-login', new LocalStrategy({
		// Override default with email
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true	
	},
	function(req, email, password, done) {
		User.findOne({'local.email': email}, function(err, user) {
			if (err) 
				return done(err);

			if (!user) 
				return done(null, false, req.flash('loginMessage', 'No user found.'));	

			// if the user is fond but password wrong
			if (!user.validPassword(password)) 
				return done(null, false, req.flash('loginMessage', 'Email or password is invalid.'));

			return done(null, user);	// return successful user
		})
	}));
};
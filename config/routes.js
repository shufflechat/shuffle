var User = require('../app/models/user');	// load the User model
var Tag = require('../app/models/tag');	// load the Tag model


module.exports = function(app, passport) {
	app.get('/', function(req, res) {
		res.render('index.ejs');	// Home page (with login links)
	});

	app.get('/login', function(req, res) {
		if (req.isAuthenticated()) {
			res.render('users/profile.ejs', {
				user: req.user		// get the user out of session and pass to template
			});
		}
		else {
			res.render('login.ejs', { message: req.flash('loginMessage') });	// render the page and pass in any flash data if it exists
		}
	});

	// Process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect: '/profile', 
		failureRedirect: '/login', 
		failureFlash: true
	}));

	// Process the sign up form
	app.post('/signup', passport.authenticate('local-signup', 
		{ 
			successRedirect: '/profile', failureRedirect: '/signup', failureFlash: true	
		}));		// For more info on redirecting, visit: http://stackoverflow.com/questions/15711127/express-passport-node-js-error-handling

	// Show the signup form
	app.get('/signup', function(req, res) {
		if (req.isAuthenticated()) {
			res.render('users/profile.ejs', {
				user: req.user		// get the user out of session and pass to template
			});
		}
		else {
			res.render('signup.ejs', {message: req.flash('signupMessage')});
		}

	});

	// Profile Section
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('users/profile.ejs', {
			user: req.user		// get the user out of session and pass to template
		});
	});

	// Log out
	app.get('/logout', function(req, res) {
		req.logout();		// provided by passport 
		res.redirect('/');
	});

	// RESTful User routes
	app.get('/users', function(req, res) {
		User.find({}, function(err, users) {
			res.json(users);
		});	
	});

	// user show page
	app.get('/users/:id', isLoggedIn, function(req, res) {
		User.findById(req.params.id, function(err, user) {
			console.log(user);
			// If it is the user's own page 
			if (req.user == user) {
				res.render('users/profile.ejs', {
					current_user: req.user,
					user: req.user
				});
			}
			else {
				res.render('users/show.ejs', {
					current_user: req.user,
					user: user
				});
			}
		});
	});

	// listing all of the user's friends
	app.get('/users/:id/friends', isLoggedIn, function(req, res) {
		User.findById(req.params.id, function(err, user) {
			console.log(user);
			res.render('users/friends.ejs', {
				current_user: req.user,
				user: user
			});
		});
	});

	app.post('/users/friendship', function(req, res) {
		console.log("Request body: ", req.body);

		User.find({$or: [ {_id: req.body.curr_user_id}, {_id: req.body.user_id}]}, function(err, users) {
			console.log("Find by ids: ", users);

			// Since the queried results are unordered (in that we don't know who the requester was anymore)
			var requesting_user, target_user;
			if (users[0].id == req.body.curr_user_id) {
				requesting_user = users[0];
				target_user = users[1];
			}
			else {
				target_user = users[0];
				requesting_user = users[1];
			}
			// Make appropriate function calls according to type
			if (req.body.type == 'add') {
				requesting_user.sendFriendRequest(target_user);
			}
			else if (req.body.type == 'accept') {
				requesting_user.acceptRequest(target_user);
			}
			else if (req.body.type == 'decline') {
				requesting_user.declineRequest(target_user);
			} 
		});
	});

	// Chat Page
	app.get('/chat', function(req, res) {
		res.render('chat.ejs', {
			user: req.user		
		});
	});		

	// Handle new tags
	app.post('/new_tags', function(req, res) {
		// Save the tag objects
		console.log("POST request for new tags: ", req.body);
		var tags = req.body.tags;
		var user_id = req.body.user_id;

		User.findOne({'_id': user_id }, function(err, user) {//({'id': user_id }, function(err, user) {
			if (user) {		// Check if user already exists		
				for (var i = 0; i < tags.length; i++) {
					(function(tag_name) {
						Tag.findOne({'name': tag_name }, function(err, tag) {
							if (!tag) {		// If not existing, add to database. 
								var new_tag = new Tag();
								new_tag.name = tag_name;
								new_tag.categories = [];
								new_tag.categories.push('general');		// TODO replace with an incoming tag category

								new_tag.save(function(err) {
									if (err) throw err;
								});

								tag = new_tag;
							}

							// Link the tag with user, if not already existing.
							if (user.tags.indexOf(tag.id) == -1) 
								user.tags.push(tag);
		
							if (tag.users.indexOf(user.id) == -1) 
								tag.users.push(user.id);
							tag.save();

							console.log("Updated tags of the user: ", user.tags);
							user.save();
						});
					})(tags[i]);
				}

				res.send({"message": "Successfully added tags"});		
			}
		});
	});
};

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect('/');
}
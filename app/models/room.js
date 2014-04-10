// Constructor of the room object
function Room(id, owner) {
	// this.name = name;	// we don't need this attribute, use the unique identifier
	this.id = id;			// UUID
	this.owner = owner;		// Socket id, through which we can access the user_id, name, and email
	this.people = [];		// Socket ids
	this.status = "available";
	this.tags = [];			// a unique list of tags, each user's tags should be appended to this array every time a new user joins

	// To keep track of things
	this.available = true;
	this.incoming_merges = [];	
	this.outgoing_merges = [];
}

Room.prototype.addPerson = function(personID) {
	this.people.push(personID);
};

module.exports = Room;
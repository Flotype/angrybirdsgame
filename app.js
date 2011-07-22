var ejs = require('ejs');
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
app.set('view engine', 'ejs');
app.set('view options', {layout: false});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index');
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);

var nowjs = require('now');
var everyone = nowjs.initialize(app);

var freeUsers = [];
var groups = [];

//on connect: look for a partner. If one is found, create a
//2 player game. otherwise put this.user in the queue
everyone.on('connect', function() {
	console.log('PLEASE GET HERE!');
	if(freeUsers.length != 0) {
		var partnerId = freeUsers.shift();
		var groupName = partnerId + '_' + this.user.clientId;
		//var newGroup = nowjs.getGroup(groupName);

		//newGroup.addUser(partnerId);
		//newGroup.addUser(this.user.clientId);

		//newGroup.now.players = {player1: this.user.clientId, player2: partnerId};
		//newGroup.now.turn = this.user.clientId;
		//newGroup.now.groupName = groupName;

		//newGroup.now.initGame();

		//groups.push(groupName);
		
	} else {
		//nowjs.getClient(this.user.clientId, function() {
			//this.now.message('Waiting for partner...');
		//});
		freeUsers.push(this.user.clientId);
	}
});

everyone.on('disconnect', function() {
	for(var i in freeUsers) {
		if(freeUsers[i] == this.user.clientId) {
			freeUsers.splice(i, 1);
		}
	}
	var idRegEx = /(\d+)_(\d+)/
	for(var i in groups) {
		var ids = idRegEx.exec(groups[i]);
		if(ids[1] == this.user.clientId) {			
			var group = nowjs.getGroup(groups[i]);
			group.removeUser(ids[1]);
			group.removeUser(ids[2]);
			everyone.hasClient(ids[2], function(val) {
				if(val) {
					freeUsers.push(ids[2]);
				}
			})
			
			return;
		} else if(ids[2] == this.user.clientId) {
			var group = nowjs.getGroup(groups[i]);
			group.removeUser(ids[1]);
			group.removeUser(ids[2]);
			everyone.hasClient(ids[1], function(val) {
				if(val) {
					freeUsers.push(ids[1]);
				}
			})
			return;
		}
	}
});

everyone.now.distributeShot = function(startCoords, dims, delta, angle, groupName) {
	var group = nowjs.getGroup(groupName);
	group.now.shoot(startCoords, dims, delta, angle);	
};


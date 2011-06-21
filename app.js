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

/*app.get('/images/BLUE_GRASS_FG_1.png', function(req, res){
	path = '/images/BLUE_GRASS_FG_1.png';
	fs.readFile(path, function(err, data){
					res.writeHead(200);  
					res.write(data);  
					res.end();
	});
});*/

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);

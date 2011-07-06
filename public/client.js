$(document).ready(function() {
	var canvas = document.getElementById('foreground');
	var fgContext = canvas.getContext('2d');
	var canvas = document.getElementById('fg1');
	var fgContext2 = canvas.getContext('2d');
	var canvas = document.getElementById('bg0');
	var bgContext = canvas.getContext('2d');
//physics world
	var world;

//stores images for tiling
	var bgTiles = {};
//stores bg static images;
	var bgImages = {}
//stores images that live on the foreground
	var fgImages = {};

	//whether or not we are in motion;
	var moving = false
	//whether we are shooting
	var shooting = false;
	//global var so that we can always stop motion if we want
	var interval;
	//boolean whether or not it is this client's turn
	var turn;
	//which side is the focus on when zoomed out
	var focus = 'left';

//called whenever some change to the config.viewport is occurring.	
	function modifyViewport(zoom, x) {
		if(moving) {
			return;
		}
		var incr;
		moving = true;
		if(x > config.viewport.x0) {
			incr = 4;
		} else if(x < config.viewport.x0){
			incr = -4;
		} else {
			zoom - config.viewport.zoom > 0 ? incr = -4 : incr = 4;
		}
		if(zoom != config.viewport.zoom) {
			var zoomDiff;
			if(config.viewport.x0 != x) {
				zoomDiff = ((zoom - config.viewport.zoom) / (x - config.viewport.x0 )) * incr;
			} else {
				var steps = (config.viewport.height / zoom - config.viewport.height / config.viewport.zoom) / incr;
				zoomDiff = (zoom - config.viewport.zoom) / steps;

			}
		}

		//set the redraw interval
		interval = setInterval(function() {
			if(! transitionView(x, zoom, incr, zoomDiff)) {
				clearInterval(interval);
				moving = false;
				config.viewport.x0 = x;
				config.viewport.zoom = zoom;
				if(config.viewport.x0 > config.viewport.width - 5) {
					config.viewport.x0 -= config.viewport.width;
					if(config.viewport.x0 < 0) {
						config.viewport.x0 = 0;
					}
				}
				redraw();
			}
		}, 10);
	}
	
//handles a single frame of animation by adjusting image size and position and redrawing the canvas.
	function transitionView(goalX, goalZoom, incr, zoomDiff) {
		if(Math.abs(config.viewport.x0 - goalX) < 5) {
			 if (zoomDiff == undefined || Math.abs(config.viewport.zoom - goalZoom) < .01) {
				return false;
			} else {
				config.viewport.zoom += zoomDiff;
			}
		} else {
			config.viewport.x0 += incr;
			if(zoomDiff != undefined) {
				config.viewport.zoom += zoomDiff;
			}
		}
		redraw();
		return true;
	}
	
	//redraw the entire canvas with updated positions.
	function redraw() {
		bgContext.clearRect(0, 0, config.viewport.width, config.viewport.height);
		fgContext.clearRect(0, 0, config.viewport.width, config.viewport.height);
		fgContext2.clearRect(0, 0, config.viewport.width, config.viewport.height);
		placeBgTiles();
		placeBgImages();
		drawLevel();
	}

/*
* event handlers
*/
//this is set on mousedown, then used to prevent action on long clicks.
var mouseDownTime;

//click handler
	var panner = function(e) {
		if(moving) {
			return;
		}
		if(config.viewport.zoom == .5) {
			var canvasCoords = $('canvas').offset();
			var relX = e.pageX - canvasCoords.left;
			if(getUnits(relX) > 800) {
				focus = 'right';
			} else {
				focus = 'left';	
			}
		} else {
			//if the click was a long click, don't do anything
			if(e.timeStamp - mouseDownTime > 200) {
				return;
			}
			//click event gets triggered on mouseup. This adds a delay so that we won't do anything on the intial mouseup.
			if(shooting) {
				shooting = false;
				return;
			}
			if(getRightBound() + config.viewport.x0 >= config.viewport.width) {
				modifyViewport(config.defaultLeft.zoom, config.defaultLeft.x0);
			} else {
				modifyViewport(config.defaultRight.zoom, config.defaultRight.x0);
			}
		}
	};


	//helper functions
	function prepareShot(mouseX, mouseY) {
		fgContext2.clearRect(0, 0, config.viewport.width, config.viewport.height);
		var img = fgImages['SLINGSHOT_RUBBERBAND.png'];
		//scale these down by .5
		var canvWidth = .3 * getPixels(img.width);
		var canvHeight = .3 * getPixels(img.height);
		var ss = getSS();

		var mouseVpCoords = getViewportCoords(mouseX, mouseY);
		
		//used to calculate the midpoint of the slingshot
		var midPtX = 0;
		var midPtY = 0;

		for(var i in ss) {
			var ssComponent = ss[i];
			//var coords = getCanvasCoords(ssComponent.defaultX, ssComponent.defaultY);
			var x, y;
			if(ssComponent.index == 1) {
				x = ssComponent.defaultX + config.ssOffset.front.x;
				y = ssComponent.defaultY + config.ssOffset.front.y;
			} else {
				x = ssComponent.defaultX + config.ssOffset.back.x;
				y = ssComponent.defaultY + config.ssOffset.back.y;
			}
			midPtX += x;
			midPtY += y;

			var delX = x - mouseVpCoords.x;
			var delY = y - mouseVpCoords.y;
			var angle = Math.atan(1.0 * delY / delX);
			if(delX < 0) {
				angle += Math.PI;
			}

			fgContext2.save();
			fgContext2.translate(mouseX, mouseY);
			fgContext2.rotate(angle);
			var rotHor = 0;
			var dist = Math.sqrt(delX * delX + delY * delY);

			while(rotHor + canvWidth <  getPixels(dist)) {
				
				fgContext2.drawImage(img, rotHor, -1 * canvHeight / 2.0, canvWidth, canvHeight);
				rotHor += canvWidth - 1;
			}
			//last tile
			var finalCanvWidth = getPixels(dist) - rotHor;
			fgContext2.drawImage(img, 0, 0, finalCanvWidth * (canvWidth / img.vpWidth), img.height, rotHor, -1 * canvHeight / 2, finalCanvWidth, canvHeight);
			fgContext2.restore();
		}

		var bird = getMedBird();
		var birdCanvWidth = getPixels(bird.sWidth / 2.0);
		var birdCanvHeight = getPixels(bird.sHeight / 2.0);
		fgContext2.drawImage(bird.img, bird.sx, bird.sy, bird.sWidth, bird.sHeight, mouseX - birdCanvWidth / 2, mouseY - birdCanvHeight / 2, birdCanvWidth, birdCanvHeight);
	
		midPtX /= 2.0;
		midPtY /= 2.0;	

		var delX = midPtX - mouseVpCoords.x;
		var delY = midPtY - mouseVpCoords.y;
		var dist = Math.sqrt(delX * delX + delY * delY);
		var angle = Math.atan(1.0 * delY / delX);
		if(delX < 0) {
			angle += Math.PI;
		}
		$('canvas').unbind('mouseup');
		$('canvas').mouseup(function(e) {
				 //clear the slingshot graphics
				now.distributeShot({x: mouseVpCoords.x, y: mouseVpCoords.y}, {x: bird.sWidth / 2.0, y: bird.sHeight / 2.0}, dist, angle, now.groupName);
				//now.distributeShot(mouseVpCoords.x, mouseVpCoords.y, bird.sWidth / 2.0, bird.sHeight / 2.0, dist, angle, now.groupName);
				//now.log("hi");
				//unbind mousemove handler
				$(this).unbind('mousemove');
		});
	}


//single physics step
	function step(trigger) {
		var timeStep = 1.0 / 60;
		var iteration = 1;
		world.Step(timeStep, iteration);
		fgContext.clearRect(0, 0, config.viewport.width, config.viewport.height);
		fgContext2.clearRect(0, 0, config.viewport.width, config.viewport.height);
		for(var i = world.m_bodyList; i; i=i.m_next) {
			if(i.userData != undefined) {
				if(trigger && i.userData.type == 'projectile') {

					if(getPixels(i.m_position.x - config.viewport.x0) > 400 && config.viewport.zoom > 0.5 && getPixels(config.viewport.width - config.viewport.x0) >= 800) {
						transitionView(config.viewport.x0 + 5, config.viewport.zoom, 5);
					}

					var velocity = i.GetLinearVelocity();
					//execute if movement is finished and we want to reset from shooting state to normal state.
					if(Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01) {
						if(structureIsStatic()) {
							//rebind the click handler and unbind mouseup
							$('canvas').click(panner).unbind('mouseup');
							 moving = false;
							 shooting = false;
							 //destroy physics body
							 world.DestroyBody(i);
							 return false;
						}
					}
				} else if(!trigger) {
					if(structureIsStatic()) {
						return false;
					}
				}
				for(var s = i.GetShapeList(); s != null; s = s.GetNext()) {
					if(s != world.m_groundBody) {
						drawShape(s, i.userData.type, i.userData.defPos, i.m_rotation);
					}
				}
			}
		}
		return true;
	}
	//draw the structure
	function drawLevel() {
		for(var i = world.m_bodyList; i; i = i.m_next) {
			if(i.userData != undefined && i.userData.type != 'projectile') {
				for(var s = i.GetShapeList(); s != null; s = s.GetNext()) {
						drawShape(s, i.userData.type, i.userData.defPos, i.m_rotation);
				}
			}
		}
	}
//draw physics shape on the canvas.
	function drawShape(shape, type, defPos, angle) {
		switch(type) {
			case 'projectile': 
				fgContext2.save();
				var translateCoords = getCanvasCoords(shape.m_position.x, shape.m_position.y);
				//var radius = getPixels(shape.m_radius);
				fgContext2.translate(translateCoords.x, translateCoords.y);
				fgContext2.rotate(angle + defPos);
				var bird = getMedBird();
				var width = getPixels(bird.sWidth / 2.0);
				var height = getPixels(bird.sHeight / 2.0);
				
				
				fgContext2.drawImage(bird.img, bird.sx, bird.sy, bird.sWidth, bird.sHeight, -width / 2, -height / 2, width, height);
				fgContext2.restore();
				break;	
			case 'longWood':
				fgContext.save();
				var translateCoords = getCanvasCoords(shape.m_position.x, shape.m_position.y);
				fgContext.translate(translateCoords.x, translateCoords.y);
				fgContext.rotate(angle + defPos);
				var longWood = getGameBlock(5, 5, 2.5, .25, 0, 1, 1, 4);
				var width = getPixels(longWood.sWidth / 2.0);
				var height = getPixels(longWood.sHeight / 2.0);
				fgContext.drawImage(longWood.img, longWood.sx, longWood.sy, longWood.sWidth, longWood.sHeight, -width / 2.0, -height / 2.0, width, height);
				fgContext.restore();
				break;
			case 'platform':
				fgContext.save();
				var translateCoords = getCanvasCoords(shape.m_position.x, shape.m_position.y);
				fgContext.translate(translateCoords.x, translateCoords.y);
				fgContext.rotate(angle + defPos);
				var platform = getMiscPlatform1();
				var vpWidth = platform.sWidth / 2.0;
				var vpHeight = platform.sHeight / 2.0;
				var canvWidth = getPixels(vpWidth);
				var canvHeight = getPixels(vpHeight);
				fgContext.drawImage(platform.img, platform.sx, platform.sy, platform.sWidth, platform.sHeight, -canvWidth / 2.0, -canvHeight / 2.0, canvWidth, canvHeight);
				fgContext.restore();
				break;
		}
	}

	function getRightBound() {
		var coords = getViewportCoords(800, 0);
		return coords.x
	}
	
	//place non-tile background images	
	function placeBgImages() {
		for(var i in bgImages) {
			var img = bgImages[i];

			var height = getPixels(img.vpHeight);
			var width = getPixels(img.vpWidth);
			var x;

			if(img.defaultX < config.viewport.x0 && img.defaultX + img.vpWidth > config.viewport.x0) {
				var crop = config.viewport.x0 - img.defaultX;

				var imageWidth = Math.round(img.width - crop * (img.width / img.vpWidth));

				var canvCoords = getCanvasCoords(config.viewport.x0, img.defaultY);
				bgContext.drawImage(img, crop * (img.width / img.vpWidth), 0, imageWidth, img.height, canvCoords.x, canvCoords.y, width - getPixels(crop), height);
			} else if(img.defaultX >= config.viewport.x0) {
				var canvCoords = getCanvasCoords(img.defaultX, img.defaultY);
				bgContext.drawImage(img, canvCoords.x, canvCoords.y, width, height);
			} else if(getPixels(config.viewport.width - config.viewport.x0) < 800) {
				var canvCoords = getCanvasCoords(img.defaultX + config.viewport.width, img.defaultY);
				bgContext.drawImage(img, canvCoords.x, canvCoords.y, width, height);
			}
		}
	}

		//place tile images	
	function placeBgTiles() {
		for(var i in bgTiles) {
			var img = bgTiles[i] 
			//scaled dimensions of the image to account for zoom
			canvWidth = getPixels(img.vpWidth);
			canvHeight = getPixels(img.vpHeight);
			
			//crop of the first image.
			var initialOffset = config.viewport.x0;
			while(initialOffset > img.vpWidth) {
				initialOffset -= img.vpWidth;
			}
			//initial width of the image, adjusted for the config.viewport position
			var initialCanvWidth = canvWidth - getPixels(initialOffset);

			var horzPos = 0;

			
			//specific positioning for each image
			var y = img.defaultY;	
			switch(img.index){
				case 1: 
					y = img.defaultY;
					break;
				case 2: 
					y = img.defaultY;
					break;
			}
			//first tile
			var canvCoords = getCanvasCoords(config.viewport.x0, y);
			bgContext.drawImage(img, initialOffset * (img.width / img.vpWidth), 0, img.width - initialOffset * (img.width / img.vpWidth), img.height, horzPos, canvCoords.y, initialCanvWidth, canvHeight);

			horzPos += initialCanvWidth;

			//filler tiles
			while(horzPos + canvWidth <= config.viewport.width) {
				bgContext.drawImage(img, horzPos, canvCoords.y, canvWidth, canvHeight);
				horzPos += canvWidth;
			}
	
			//last tile
			var finalWidth = getUnits(config.viewport.width - horzPos);
			while(finalWidth <= 0) {
				finalWidth += img.vpWidth;
			}
			bgContext.drawImage(img, 0, 0, finalWidth * (img.width / img.vpWidth), img.height, horzPos, canvCoords.y, getPixels(finalWidth), canvHeight);
		}
	}
	
	//returns an object that contains both slingshot images
	function getSS() {
		return bgImages;
	}
	
	function getBandSize(mouseX, mouseY) {
		var sec1, sec2;
		var coords = getViewportCoords(mouseX, mouseY);
		var ss = getSS();
		for(var i in ss) {
			img = ss[i];
			if(img.index == 1) {
				var y = img.defaultY + config.ssOffset.front.y;
				var x = img.defaultX + config.ssOffset.front.x;
				sec1 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			} else {
				var y = img.defaultY + config.ssOffset.back.y;
				var x = img.defaultX + config.ssOffset.back.x;
				sec2 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			}
			
		}
		return sec1 + sec2;
	}

//given a pixel location, convert to global config.viewport location
	function getViewportCoords(canX, canY) {
		var vpX = Math.round(canX / config.viewport.zoom + config.viewport.x0);
		var vpY = Math.round((canY - config.viewport.height + config.viewport.groundY) / config.viewport.zoom + config.viewport.height - config.viewport.groundY);
		return {x: vpX, y: vpY};
	}

//given a global config.viewport x and y, get coords on the canvas right now
	function getCanvasCoords(viewportX, viewportY) {
		if(viewportX < config.viewport.x0) {
			return -1;
		}
		var x = Math.round((viewportX - config.viewport.x0) * config.viewport.zoom);
		var y = Math.round((viewportY - config.viewport.height + config.viewport.groundY) * config.viewport.zoom + config.viewport.height - config.viewport.groundY);
		return {x: x, y: y}
	}

//convert config.viewport units to pixels
	function getPixels(x) {
		return Math.round(x * config.viewport.zoom);
	}
//convert pixels to config.viewport units
	function getUnits(x) {
		return Math.ceil(x / config.viewport.zoom);
	}

	function getMedBird() {
		var charSheet = new Image();
		src	= '/images/INGAME_BIRDS_PIGS.png';
		return {img: fgImages['INGAME_BIRDS_PIGS.png'], sx: 800, sy: 0, sWidth: 59, sHeight: 50};
	}


//load all the images and store them, then call redraw()
	function init() {
		var loaded = 0;
		var tileKeys = Object.keys(config.bg1TileSrcs);
		var bgKeys = Object.keys(config.bg1ImgSrcs);
		var fgKeys = Object.keys(config.fgImgSrcs);

		var totalImages = tileKeys.length + bgKeys.length + fgKeys.length;

		//load tile images
		var key;
		for(var i = 0, ll = tileKeys.length; i < ll; i++) {
			key = tileKeys[i];
			data = config.bg1TileSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.width = data.width;
			img.defaultY= config.viewport.height - config.viewport.groundY - data.vpHeight;
			img.index = data.index;
			img.vpWidth = data.vpWidth;
			img.vpHeight = data.vpHeight;

			bgTiles[key] = img;
			//when all images are loaded, draw.
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					createLevel();
					redraw();
				}
			}
		};

		//load non-tile bg images
		for(var i = 0, ll = bgKeys.length; i < ll; i++) {
			key = bgKeys[i];
			data = config.bg1ImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.defaultY = config.viewport.height - config.viewport.groundY - data.vpHeight;
			if(data.defaultY != undefined) {
				img.defaultY -= data.defaultY;
			}
			img.defaultX = data.defaultX;
			img.index = data.index;
			img.vpWidth = data.vpWidth;
			img.vpHeight = data.vpHeight;

			bgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					createLevel();
					redraw();
				}
			}
		}

		//load foreground images
		for(var i = 0, ll = fgKeys.length; i < ll; i++) {
			key = fgKeys[i];
			data = config.fgImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.width = data.width;

			if(data.vpWidth) {
				img.vpWidth = data.vpWidth;
			}

			fgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					createLevel();
					redraw();
				}
			}
		}
		//Create Physics World
		createWorld();
	//set the initial player's turn	
		turn = (now.turn == now.core.clientId);
	//set default mouse listeners	
		setDefaultListeners();

	}

	function createLevel() {
		//create level 1
		//draw platforms
		var platform = getMiscPlatform1();
		var platformWidth = platform.sWidth / 2.0;
		var platformHeight = platform.sHeight / 2.0;
		var platform1VpX = 1100;
		var platform2VpX = 1200;
		var platformVpY = config.viewport.height - config.viewport.groundY - platformHeight;
		var platform1Coords = getCanvasCoords(platform1VpX, config.viewport.height - config.viewport.groundY - platformHeight);
		var platform2Coords = getCanvasCoords(platform2VpX, config.viewport.height - config.viewport.groundY - platformHeight);

		//create physics bodies for platforms
		createBox(platform1VpX, platformVpY, platformWidth, platformHeight, 'platform', 0);


		createBox(platform2VpX, platformVpY, platformWidth, platformHeight, 'platform', 0);

		//save so we can revert after we rotate
		fgContext.save();

		//draw verticles
		var longWood = getGameBlock(5, 5, 2.5, .25, 0, 1, 1, 4);
		var longWoodWidth = longWood.sWidth / 2.0;
		var longWoodHeight = longWood.sHeight / 2.0;

		var constructionHeight = config.viewport.height - config.viewport.groundY - platformHeight - longWoodWidth;

		var longWood1VpX = 48;
		var longWood2VpX = 28;

		//create physics bodies for long wood pieces
		createBox(longWood1VpX + platform1VpX, constructionHeight, longWoodHeight, longWoodWidth, 'longWood', Math.PI / 2.0);
		createBox(longWood2VpX + platform2VpX, constructionHeight, longWoodHeight, longWoodWidth, 'longWood', Math.PI / 2.0);
		createBox(longWood1VpX + platform1VpX, constructionHeight - longWoodHeight, longWoodWidth, longWoodHeight, 'longWood', 0);
		createBox(15 + platform1VpX + longWood1VpX, constructionHeight - longWoodHeight - longWoodWidth, longWoodHeight, longWoodWidth, 'longWood', Math.PI / 2.0);
		createBox(longWood2VpX + platform2VpX - 15, constructionHeight - longWoodHeight - longWoodWidth, longWoodHeight, longWoodWidth, 'longWood', Math.PI / 2.0);
	}

	function createBox(vpX, vpY, width, height, bodyType, defaultPos) {
		//physics position is set as center
		var x = vpX + width / 2.0;

		var boxSd = new b2BoxDef();
		boxSd.extents.Set(width / 2.0, height / 2.0);
		boxSd.restitution = 0.0;
		boxSd.density = 1.0;
		var boxBd = new b2BodyDef();
		boxBd.AddShape(boxSd);
		boxBd.position.Set(x, vpY + height / 2.0);
		//boxBd.allowSleep = true;
		//boxBd.isSleeping = true;
		var body = world.CreateBody(boxBd);
		body.userData = {type: bodyType, defPos: defaultPos};
		return body;
	}

//get the platform from the INGAME_BLOCKS_MISC.png spritesheet
	function getMiscPlatform1() {
		return {img: fgImages['INGAME_BLOCKS_MISC.png'], sx: 340,sy: 283,sWidth: 187, sHeight: 57};
	}
	
	//get element in 'INGAME_BLOCKS_BASIC.png'
	function getGameBlock(row, col, unitWidth, unitHeight, subRow, subCol, subWidth, subHeight) {
		var gridWidth = 82.2;
		var gridHeight = 87.3;
		var sx = col * gridWidth;
		var sy = row * gridHeight;
		var width = gridWidth * unitWidth;
		var height = gridHeight * unitHeight;
		if(subRow) {
			sx += subRow * subWidth;
		}
		if(subCol) {
			sy += subCol * subHeight;
		}
		//tighten it up due to inconsistency of sprite sheet
		sx += 3;
		width -= 5;
		return {img: fgImages['INGAME_BLOCKS_BASIC.png'], sx: sx, sy: sy, sWidth: width, sHeight: height};
	}
	
	//returns true if the structure has a very low velocity.
	function structureIsStatic() {
		for(var i = world.m_bodyList; i; i=i.m_next) {
			if(i.userData != undefined) {
				switch(i.userData.type) {
					case 'longWood': case 'platform':
						var velocity = i.GetLinearVelocity();
						if(! (Math.abs(velocity.x) < 5 && Math.abs(velocity.y) < 5)) {
							return false;
						}
						break;
				}
			}
		}
		return true;
	}
//change the turns and do a cool animation on the config.viewport.
	function transitionTurns() {
		turn = !turn;
		for(var i = world.m_bodyList; i; i = i.m_next) {
			world.DestroyBody(i);	
		}
		$('canvas').unbind('click').unbind('mouseup').unbind('mousedown').unbind('mousewheel').unbind('mousemove');
		modifyViewport(config.viewport.zoom, config.viewport.width);
		config.viewport.x0 = 0;
		redraw();
		createWorld();
		createLevel();
		setDefaultListeners();
	}

		//create physics world
	function createWorld() {
		var worldAABB = new b2AABB();
		worldAABB.minVertex.Set(-1000, -1000)
		worldAABB.maxVertex.Set(2000, 2000);
		var gravity = new b2Vec2(0, 300);
		
		world = new b2World(worldAABB, gravity, true);
		/*
		** Create ground in physics world
		*/	
		var groundSd = new b2BoxDef();
		//distance to center.
		groundSd.extents.Set(800, 100);	
		//restitution is bounce, value between 0 and 1
		groundSd.restitution = 0.0;
		groundSd.friction = 1.0
		var groundBd = new b2BodyDef();
		groundBd.AddShape(groundSd);
		groundBd.position.Set(800, 600);
		world.CreateBody(groundBd);

		var leftSd = new b2BoxDef();
		leftSd.extents.Set(10, 300);
		leftSd.restitution = 0.0;
		leftSd.friction = 0.5;
		var leftBd = new b2BodyDef();
		leftBd.AddShape(leftSd);
		leftBd.position.Set(-10, 300);
		world.CreateBody(leftBd);

		var rightSd = new b2BoxDef();
		rightSd.extents.Set(10, 1000);
		rightSd.restitution = 0.0;
		rightSd.friction = 0.5
		var rightBd = new b2BodyDef();
		rightBd.AddShape(rightSd);
		rightBd.position.Set(1610, 300);
		world.CreateBody(rightBd);

	}
	//set the default event listeners
	function setDefaultListeners() {
		//toggle zoom and panning
			$('canvas').click(function(e) {
				panner(e)
			})
		//zoom in and out with mousewheel
			.mousewheel(function() {
				if(!moving) {
					if(config.viewport.zoom > .75) {
						//since we're going to the fully zoomed out pos, set config.viewport x to 0 so we're seeing the whole world.
						modifyViewport(0.5, 0);
					} else {
						if(focus == 'left') {
							modifyViewport(1.0, config.viewport.x0);
						} else if(focus == 'right') {
							modifyViewport(1.0, config.defaultRight.x0);
						}
					}
				}
			})
		if(turn) {
			$('#messages').html("It's your turn!");
				//rubber band animations
			 $('canvas').mousedown(function(e) {
				 if(moving) {
					return;
				 }
				 mouseDownTime = e.timeStamp;
					
					var canvasCoords = $('canvas').offset();
					var relX = e.pageX - canvasCoords.left;
					var relY = e.pageY - canvasCoords.top;
					var rad = getBandSize(relX, relY);
					//If cursor is outside of the range of the rubber band, return
					if(rad > config.bandSize) {
						return;
					}
					//If we're not in a position to shoot, return.
				 if(config.viewport.x0 != 0){
					return;
				 }
				 moving = true;
				 shooting = true;

					prepareShot(relX, relY);
					$(this).mousemove(function(e2) {
						var relX2 = e2.pageX - canvasCoords.left;
						var relY2 = e2.pageY - canvasCoords.top;
						if(getBandSize(relX2, relY2) > config.bandSize) {
							return;
						}
						prepareShot(e2.pageX - canvasCoords.left, e2.pageY - canvasCoords.top);
					});
					$(this).unbind('click');
				});
		} else {
			$('#messages').html("It's not your turn--wait for the other player to go!");
		}

	}
/*
** nowJS client functions
*/
now.message = function(msg) {
	var splashScreen = new Image();
	splashScreen.src = '/images/Splash_AB_Logo.jpg';
	splashScreen.onload = function() {
		fgContext.drawImage(splashScreen, 0, 0, 800, 600);
	};
 	$('#messages').html('').append(msg);
};

now.initGame = function() {
	$('#ground').css('background-color', config.groundColor);
	$('#sky').css('background-color', config.skyColor);
	$('#messages').html('Partner Found!');
	init();
};

	now.shoot = function(startCoords, dims, delta, angle) {
		//Create projectile
		var projectileSd = new b2BoxDef();
		projectileSd.density = 1.5;
		projectileSd.extents.Set(10.5, 9);
		projectileSd.restitution = 0.0;
		projectileSd.friction = 0.5;
		var projectileBd = new b2BodyDef();
		projectileBd.AddShape(projectileSd);
		projectileBd.position.Set(startCoords.x, startCoords.y);
		var body = world.CreateBody(projectileBd);
		body.userData = {type: 'projectile', defPos: 0};

		var forceX = config.forceCoeff * Math.cos(angle);
		var forceY = config.forceCoeff * Math.sin(angle);

		body.ApplyForce(new b2Vec2(forceX, forceY), new b2Vec2(startCoords.x, startCoords.y));

		(function interval() {
			setTimeout(function() {
				if(step(true)) {
					interval();
				} else {
					step(true);
					(function secondInterval() {
						setTimeout(function() {
							if(step(false)) {
								secondInterval();
							} else {
								step(true);
								transitionTurns();
							}
						}, 20);
					})();
				}
			}, 20);
		})();
	};

});

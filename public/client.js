$(document).ready(function() {
	var canvas = document.getElementById('foreground');
	var fgContext = canvas.getContext('2d');
	var canvas = document.getElementById('bg0');
	var bgContext = canvas.getContext('2d');

//initial values for viewport	
	var viewport = {
		height: 600,
		width: 800,
		zoom: 0.5,
		x0: 0, 
		x1: 800,
		y0: 0,
		y1: 600,
		//ground level
		groundY: 200,
		//zoomed out
		currView: 0,
	};

//default zoomed in left-hand position
	var defaultLeft = {
		zoom: 1.0,
		x0: 0,
		viewCode: 1,
	};

//default zoomed in right-hand position
	var defaultRight = {
		zoom: 1.0,
		x0: 400,
		viewCode: 2,
	}

//stores images for tiling
	var bgTiles = {};
//stores bg static images;
	var bgImages = {}
//stores images that live on the foreground
	var fgImages = {};

//speed that viewport is moved
	var incr;
	//whether or not we are in motion;
	var moving = false
	//whether we are shooting
	var shooting = false;
	//global var so that we can always stop motion if we want
	var interval;

	//At full size, offset from the slingshot to the rubber band attachment points
	const ssOffset = {
		front: { x: 15, y: 15 },
		back: { x: 15, y: 25}
	};
	//height of the slingshot;
	const ssHeight = 199;
	//max size of rubber band
	const bandSize = 450;

//load all the images and store them, then call redraw()
	function init() {
		var bg1TileSrcs = {'BLUE_GRASS_FG_1.png': {height: 187, width: 332, defaultY: viewport.height - viewport.groundY, index: 1},
									 'BLUE_GRASS_FG_2.png': {height: 33, width: 332, defaultY: viewport.height - viewport.groundY - 33, index: 2}, 
		};
		var bg1ImgSrcs = {'SLINGSHOT_01_BACK.png': {height: 199, width: 38, defaultY: viewport.height - viewport.groundY - 124, defaultX: 250, index: 1},
									 		'SLINGSHOT_01_FRONT.png': {height: 124, width: 43, defaultY: viewport.height - viewport.groundY - 124, defaultX: 220, index: 2},
		};
		var fgImgSrcs = {
									 'INGAME_BIRDS_PIGS.png': {height: 920, width: 859},
									 'SLINGSHOT_RUBBERBAND.png': {height: 16, width: 14},
		};
		var loaded = 0;
		var tileKeys = Object.keys(bg1TileSrcs);
		var bgKeys = Object.keys(bg1ImgSrcs);
		var fgKeys = Object.keys(fgImgSrcs);

		var totalImages = tileKeys.length + bgKeys.length + fgKeys.length;

		//load tile images
		var key;
		for(var i = 0, ll = tileKeys.length; i < ll; i++) {
			key = tileKeys[i];
			data = bg1TileSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.width = data.width;
			img.defaultY= data.defaultY;
			img.index = data.index;

			bgTiles[key] = img;
			//when all images are loaded, draw.
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		};

		//load non-tile bg images
		for(var i = 0, ll = bgKeys.length; i < ll; i++) {
			key = bgKeys[i];
			data = bg1ImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.defaultY = data.defaultY;
			img.defaultX = data.defaultX;
			img.index = data.index;

			bgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		}

		//load foreground images
		for(var i = 0, ll = fgKeys.length; i < ll; i++) {
			key = fgKeys[i];
			data = fgImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;

			img.defaultY = data.defaultY;
			img.defaultX = data.defaultX;

			fgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		}
	}

//called whenever some change to the viewport is occurring.	
	function modifyViewport(zoom, x) {
		if(moving) {
			return;
		}
		moving = true;
		if(x > viewport.x0) {
			incr = 4;
		} else if(x < viewport.x0){
			incr = -4;
		} else {
			zoom - viewport.zoom > 0 ? incr = -4 : incr = 4;
		}
		if(zoom != viewport.zoom) {
			var zoomDiff;
			if(viewport.x0 != x) {
				zoomDiff = ((zoom - viewport.zoom) / (x - viewport.x0 )) * incr;
			} else {
				var steps = (viewport.height / zoom - viewport.height / viewport.zoom) / incr;
				zoomDiff = (zoom - viewport.zoom) / steps;

			}
		}

		//set the redraw interval
		interval = setInterval(function() {
			if(! transitionView(x, zoom, zoomDiff)) {
				clearInterval(interval);
				moving = false;
			}
		}, 10);
	}
	
//handles a single frame of animation by adjusting image size and position and redrawing the canvas.
	function transitionView(goalX, goalZoom, zoomDiff) {
		//console.log(Math.abs(viewport.x0 - goalX) < 2 && (zoomDiff == undefined || Math.abs(viewport.zoom - goalZoom) < .01));
		if(Math.abs(viewport.x0 - goalX) < 2) {
			 if (zoomDiff == undefined || Math.abs(viewport.zoom - goalZoom) < .01) {
/*				viewport.x0 = goalX;
				viewport.zoom = goalZoom;
				redraw();*/
				return false;
			} else {
				viewport.zoom += zoomDiff;
				//viewport.x1 += incr;
			}
		} else {
			viewport.x0 += incr;
			//viewport.x1 += incr;
			if(goalZoom != undefined) {
				viewport.zoom += zoomDiff;
			}
		}
		redraw();
		return true;
	}
	
	//redraw the entire canvas with updated positions.
	function redraw() {
		bgContext.clearRect(0, 0, viewport.width, viewport.height);
		placeBgTiles();
		placeBgImages();
	}

/*
* event handlers
*/
//this is set on mousedown, then used to prevent action on long clicks.
var mouseDownTime;

//click handler
	var panner = function(e) {
		//if the click was a long click, don't do anything
		if(e.timeStamp - mouseDownTime > 200) {
			return;
		}
		//click event gets triggered on mouseup. This adds a delay so that we won't do anything on the intial mouseup.
		if(shooting) {
			shooting = false;
			return;
		}
		if(getLeftBound() + viewport.x0 > viewport.width) {
			modifyViewport(defaultLeft.zoom, defaultLeft.x0);
		} else {
			modifyViewport(defaultRight.zoom, defaultRight.x0);
		}
	};

//toggle zoom and panning
	$('canvas').click(function(e) {
		panner(e)
	})
//zoom in and out with mousewheel
	.mousewheel(function() {
		if(!moving) {
			if(viewport.zoom > .75) {
				//since we're going to the fully zoomed out pos, set viewport x to 0 so we're seeing the whole world.
				modifyViewport(0.5, 0);
			} else {
				modifyViewport(1.0, viewport.x0);
			}
		}
	})
	//rubber band animations
 .mousedown(function(e) {
	 mouseDownTime = e.timeStamp;
	 console.log('zoom: ' + viewport.zoom);
		
		var canvasCoords = $('canvas').offset();
		var relX = e.pageX - canvasCoords.left;
		var relY = e.pageY - canvasCoords.top;
		var rad = getBandSize(relX, relY);
		console.log('rad: ' + rad);
		//If cursor is outside of the range of the rubber band, return
		if(rad > bandSize) {
			return;
		}
		//If we're not in a position to shoot, return.
	 if(moving || viewport.x0 != 0){
		return;
	 }
	 moving = true;
	 shooting = true;

		prepareShot(relX, relY);
		$(this).mousemove(function(e2) {
			prepareShot(e2.pageX - canvasCoords.left, e2.pageY - canvasCoords.top);
		});
		$(this).unbind('click');
	})
 .mouseup(function(e) {
	 //clear the slingshot graphics
	clearShot();
	//unbind mousemove handler
	$(this).unbind('mousemove');
	//rebind the click handler
	$(this).click(panner);
	 moving = false;
 });



	init();

	//helper functions
	function prepareShot(mouseX, mouseY) {
		fgContext.clearRect(0, 0, viewport.width, viewport.height);
		
		var img = fgImages['SLINGSHOT_RUBBERBAND.png'];
		var width = Math.ceil(img.width * viewport.zoom * .5);
		var height = Math.ceil(img.height * viewport.zoom * .5);


		var ss = getSS();
		var y = Math.round(viewport.height - viewport.groundY - ssHeight * viewport.zoom);
		for(var i in ss) {
			var ssComponent = ss[i];
			x = Math.ceil((ssComponent.defaultX - viewport.x0) * viewport.zoom);
			if(ssComponent.index == 1) {
				x += ssOffset.front.x;
				y += ssOffset.front.y;
			} else {
				x += ssOffset.back.x;
				y += ssOffset.back.y;
			}
			
			var delX = x - mouseX;
			var delY = y - mouseY;
			var angle = Math.atan(1.0 * delY / delX);
			if(delX < 0) {
				angle += Math.PI;
			}

			fgContext.save();
			fgContext.translate(mouseX, mouseY);
			fgContext.rotate(angle);
			var rotHor = 0;

			while(rotHor < Math.sqrt(delX * delX + delY * delY)) {
				fgContext.drawImage(img, rotHor, 0, width, height);//Math.ceil(img.width * viewport.zoom), Math.ceil(img.height * viewport.zoom));
				rotHor += width;
			}
			fgContext.restore();

		}
	}

	function clearShot() {
		fgContext.clearRect(0, 0, viewport.width, viewport.height);
	}

	function getLeftBound() {
		return viewport.x0 + (1 / (2 * viewport.zoom)) * viewport.width;
	}
	
	//place non-tile background images	
	function placeBgImages() {
		for(var i in bgImages) {
			var img = bgImages[i];

			var height = Math.round(img.height * viewport.zoom);
			var width = img.width * viewport.zoom;
			var y = Math.round(viewport.height - viewport.groundY - ssHeight * viewport.zoom);
			var x;

			if(img.defaultX < viewport.x0 && img.defaultX + img.width > viewport.x0) {
				var crop = viewport.x0 - img.defaultX;
					
				x = Math.floor((img.width - crop) * viewport.zoom);
				//console.log([img, crop, 0, img.width - crop, img.height, x, y, Math.floor(crop * viewport.zoom), height]);
				bgContext.drawImage(img, crop, 0, img.width - crop, img.height, 0, y, width - crop * viewport.zoom, height);
			} else if(img.defaultX >= viewport.x0) {
				x = Math.floor((img.defaultX - viewport.x0) * viewport.zoom);
				bgContext.drawImage(img, x, y, width, height);
			}
		}
	}

		//place tile images	
	function placeBgTiles() {
		for(var i in bgTiles) {
			var img = bgTiles[i] 
			//scaled dimensions of the image to account for zoom
			adjustedWidth = img.width *  viewport.zoom;
			adjustedHeight = img.height * viewport.zoom;
			
			//initial width of the image, adjusted for the viewport position
			var initialWidth = (img.width - viewport.x0) * viewport.zoom;
			while(initialWidth < 0) {
				initialWidth += adjustedWidth;
			}

			//offset of the first image, in terms of the images original size.
			var initialOffset = img.width - (initialWidth / viewport.zoom);
			initialWidth = Math.round(initialWidth);
			var horzPos = 0;
			
			//specific positioning for each image
			var y;	
			switch(img.index){
				case 1: 
					y = viewport.height - viewport.groundY;
					break;
				case 2: 
					y = viewport.height - viewport.groundY - img.height * viewport.zoom;
					break;
			}
			//turn floating points back to integers.
			y = Math.round(y)
			initialOffset = Math.round(initialOffset);
			adjustedHeight = Math.round(adjustedHeight);
			var crop = Math.floor(initialWidth / viewport.zoom);

			//first tile
			bgContext.drawImage(img, initialOffset, 0, crop, img.height, 0, y, initialWidth, adjustedHeight);

			horzPos += initialWidth;

			//filler tiles
			adjustedWidth = Math.round(adjustedWidth);
			while(horzPos + adjustedWidth <= viewport.width){

				bgContext.drawImage(img, horzPos, y, adjustedWidth, adjustedHeight);
				horzPos += adjustedWidth;
			}
	
			//last tile
			var finalWidth = viewport.width - horzPos;
			while(finalWidth <= 0) {
				finalWidth += adjustedWidth;
			}
			//console.log([viewport.x0, viewport.x1, finalWidth, horzPos]);
			bgContext.drawImage(img, 0, 0, Math.floor(finalWidth / viewport.zoom), img.height, horzPos, y, finalWidth, adjustedHeight);
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
				var y = viewport.height - viewport.groundY  - ssHeight + ssOffset.front.y;
				var x = img.defaultX + ssOffset.front.x;
				sec1 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			} else {
				var y = viewport.height - viewport.groundY  - ssHeight + ssOffset.back.y;
				var x = img.defaultX + ssOffset.back.x;
				sec2 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			}
			
		}
		return sec1 + sec2;
	}

//converts pixels on the canvas to units on the viewport
	function getViewportCoords(canX, canY) {
		console.log('canX: ' + canX);
		var vpX = Math.round(canX / (2 * viewport.zoom) + viewport.x0);
		console.log('vpx: ' + vpX);
		var vpY = Math.round((canY - viewport.height + viewport.groundY) / (2 * viewport.zoom) + viewport.height - viewport.groundY);
		//var vpY = Math.round(canY / (2 * viewport.zoom));
		console.log('canY: ' + canY);
		console.log('vpY: ' + vpY);
		console.log('');
		return {x: vpX, y: vpY};
	}

});
